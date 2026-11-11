import hashlib
import hmac
import logging
import os
import tempfile
import time
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


TEST_SECRET = "rag-test-rag-test-rag-test-rag-test-1234-xy"
os.environ.setdefault("RAG_INTERNAL_SECRET", TEST_SECRET)
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

from fastapi.testclient import TestClient
from langchain_core.documents import Document

from app.main import app
from app.routes import (
    _open_or_build_vectorstore,
    _select_source_documents,
    load_document,
)


def signed_headers(
    action: str,
    user_id: int,
    session_id: str,
    question: str = "",
    timestamp: int | None = None,
    request_id: str | None = None,
):
    timestamp = int(time.time()) if timestamp is None else timestamp
    request_id = str(uuid.uuid4()) if request_id is None else request_id
    payload = "\n".join(
        [action, str(timestamp), str(user_id), session_id, request_id, question]
    )
    signature = hmac.new(
        TEST_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return {
        "x-rag-action": action,
        "x-rag-user-id": str(user_id),
        "x-rag-session-id": session_id,
        "x-rag-request-id": request_id,
        "x-rag-timestamp": str(timestamp),
        "x-rag-signature": signature,
    }


class FakeRetriever:
    def __init__(self, documents):
        self.documents = documents

    def invoke(self, question):
        return self.documents


class FakeLlm:
    def __init__(self):
        self.prompts = []

    def invoke(self, prompt):
        self.prompts.append(prompt)
        return SimpleNamespace(content="Réponse fictive sans donnée sensible.")


class RagSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def make_runtime(self):
        documents = [
            Document(
                page_content="Le règlement fictif prévoit deux jours de télétravail.",
                metadata={
                    "source": str(Path("C:/private/hr-secret/reglement_fictif.pdf")),
                    "title": "Règlement fictif",
                    "page": 3,
                },
            )
        ]
        llm = FakeLlm()
        return documents, FakeRetriever(documents), llm

    def test_chat_returns_sources_without_internal_paths(self):
        runtime = self.make_runtime()
        with patch("app.routes.get_rag_runtime", return_value=runtime):
            response = self.client.post(
                "/chat",
                json={
                    "question": "Quels sont les jours de télétravail ?",
                    "history": [
                        {"role": "user", "content": "Question fictive précédente"},
                    ],
                },
                headers=signed_headers("chat", 7, "conversation-7", "Quels sont les jours de télétravail ?"),
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["sources"][0]["source"], "reglement_fictif.pdf")
        self.assertNotIn("private", str(body))
        self.assertEqual(body["response"], "Réponse fictive sans donnée sensible.")
        self.assertIn("Question fictive précédente", runtime[2].prompts[0])

    def test_sessions_are_isolated_by_bff_supplied_history(self):
        runtime = self.make_runtime()
        with patch("app.routes.get_rag_runtime", return_value=runtime):
            for user_id, session_id, history_text in [
                (7, "conversation-7", "Historique fictif utilisateur 7"),
                (8, "conversation-8", "Historique fictif utilisateur 8"),
            ]:
                question = "Question fictive isolée"
                response = self.client.post(
                    "/chat",
                    json={
                        "question": question,
                        "history": [{"role": "user", "content": history_text}],
                    },
                    headers=signed_headers("chat", user_id, session_id, question),
                )
                self.assertEqual(response.status_code, 200)

        self.assertIn("utilisateur 7", runtime[2].prompts[0])
        self.assertNotIn("utilisateur 8", runtime[2].prompts[0])
        self.assertIn("utilisateur 8", runtime[2].prompts[1])
        self.assertNotIn("utilisateur 7", runtime[2].prompts[1])

    def test_chat_rejects_unsigned_or_expired_identity(self):
        runtime = self.make_runtime()
        with patch("app.routes.get_rag_runtime", return_value=runtime) as runtime_mock:
            response = self.client.post(
                "/chat",
                json={"question": "Question fictive"},
                headers={"x-rag-user-id": "7"},
            )

        self.assertEqual(response.status_code, 401)
        runtime_mock.assert_not_called()

    def test_chat_rejects_expired_signed_identity(self):
        expired_timestamp = int(time.time()) - 61
        runtime = self.make_runtime()
        with patch("app.routes.get_rag_runtime", return_value=runtime) as runtime_mock:
            response = self.client.post(
                "/chat",
                json={"question": "Question fictive"},
                headers=signed_headers(
                    "chat",
                    7,
                    "conversation-expired",
                    "Question fictive",
                    timestamp=expired_timestamp,
                ),
            )

        self.assertEqual(response.status_code, 401)
        runtime_mock.assert_not_called()

    def test_chat_rejects_replayed_signed_request(self):
        runtime = self.make_runtime()
        headers = signed_headers(
            "chat", 7, "conversation-replay", "Question fictive"
        )
        with patch("app.routes.get_rag_runtime", return_value=runtime):
            first = self.client.post(
                "/chat",
                json={"question": "Question fictive"},
                headers=headers,
            )
            replay = self.client.post(
                "/chat",
                json={"question": "Question fictive"},
                headers=headers,
            )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(replay.status_code, 401)

    def test_reset_requires_the_same_internal_authentication(self):
        invalid = self.client.delete("/chat/reset")
        self.assertEqual(invalid.status_code, 401)

        valid = self.client.delete(
            "/chat/reset",
            headers=signed_headers("reset", 7, "conversation-7"),
        )
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(valid.json(), {"message": "Historique de session réinitialisé."})

    def test_runtime_errors_are_generic_and_not_logged_with_question_data(self):
        secret_marker = "fictional-secret-marker"
        with patch("app.routes.get_rag_runtime", side_effect=RuntimeError(secret_marker)):
            with self.assertLogs("app.routes", level=logging.ERROR) as logs:
                response = self.client.post(
                    "/chat",
                    json={"question": "Question fictive contenant un nom"},
                    headers=signed_headers("chat", 7, "conversation-7", "Question fictive contenant un nom"),
                )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "RAG service unavailable."})
        self.assertNotIn(secret_marker, "\n".join(logs.output))
        self.assertNotIn("nom", "\n".join(logs.output))

    def test_supported_document_loaders_are_selected_without_external_calls(self):
        loaders = {
            ".pdf": "load_pdf",
            ".docx": "load_docx",
            ".xlsx": "load_xlsx",
            ".json": "load_json",
        }
        for extension, loader_name in loaders.items():
            with self.subTest(extension=extension), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / f"fixture{extension}"
                path.write_text("fictional fixture", encoding="utf-8")
                with patch(f"app.routes.{loader_name}", return_value=[] ) as loader:
                    self.assertEqual(load_document(str(path), "Fixture fictive"), [])
                loader.assert_called_once_with(str(path), "Fixture fictive")

    def test_keyword_fallback_adds_matching_documents(self):
        retrieved = [
            Document(page_content="retrieved", metadata={"source": "one.pdf", "page": 1}),
        ]
        fallback = Document(
            page_content="alpha beta fallback fictif",
            metadata={"source": "two.pdf", "page": 2},
        )
        selected = _select_source_documents(
            [*retrieved, fallback],
            retrieved,
            "alpha beta",
        )
        self.assertEqual([doc.page_content for doc in selected], ["retrieved", fallback.page_content])

    def test_chroma_collection_can_be_created_and_reopened_with_fake_embeddings(self):
        try:
            from langchain_chroma import Chroma
        except ImportError as error:
            self.skipTest(f"Chroma dependencies unavailable: {error}")

        class FakeEmbeddings:
            def embed_documents(self, texts):
                return [[float(index), 1.0] for index, _ in enumerate(texts)]

            def embed_query(self, text):
                return [0.0, 1.0]

        with tempfile.TemporaryDirectory() as directory:
            embedding_function = FakeEmbeddings()
            created = _open_or_build_vectorstore(
                [Document(page_content="document vectoriel fictif")],
                embedding_function,
                Path(directory),
            )
            reopened = _open_or_build_vectorstore(
                [Document(page_content="document ne devant pas etre ajoute")],
                embedding_function,
                Path(directory),
            )
            try:
                results = reopened.similarity_search(
                    "question vectorielle fictive", k=1
                )
            finally:
                # Stop the local system so Windows can remove temporary HNSW files.
                systems = set()
                for store in (created, reopened):
                    system = getattr(getattr(store, "_client", None), "_system", None)
                    if system is not None and id(system) not in systems:
                        system.stop()
                        systems.add(id(system))

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].page_content, "document vectoriel fictif")

    def test_existing_chroma_collection_is_not_reindexed(self):
        try:
            from langchain_chroma import Chroma
        except ImportError as error:
            self.skipTest(f"Chroma dependencies unavailable: {error}")

        class FakeEmbeddings:
            def embed_documents(self, texts):
                return [[float(index), 1.0] for index, _ in enumerate(texts)]

            def embed_query(self, text):
                return [0.0, 1.0]

        with tempfile.TemporaryDirectory() as directory:
            embedding_function = FakeEmbeddings()
            created = _open_or_build_vectorstore(
                [Document(page_content="document persistant fictif")],
                embedding_function,
                Path(directory),
            )
            reopened = None
            try:
                with patch.object(
                    Chroma,
                    "add_documents",
                    side_effect=AssertionError("reindexing should not occur"),
                ):
                    reopened = _open_or_build_vectorstore(
                        [Document(page_content="second document fictif")],
                        embedding_function,
                        Path(directory),
                    )
                self.assertEqual(reopened._collection.count(), 1)
            finally:
                systems = set()
                for store in (created, reopened):
                    system = getattr(getattr(store, "_client", None), "_system", None)
                    if system is not None and id(system) not in systems:
                        system.stop()
                        systems.add(id(system))

    def test_persisted_collection_supports_mmr_retrieval(self):
        class FakeEmbeddings:
            def embed_documents(self, texts):
                return [[float(index), 1.0] for index, _ in enumerate(texts)]

            def embed_query(self, text):
                return [0.0, 1.0]

        with tempfile.TemporaryDirectory() as directory:
            store = _open_or_build_vectorstore(
                [
                    Document(page_content="document MMR fictif principal"),
                    Document(page_content="document MMR fictif secondaire"),
                    Document(page_content="document MMR fictif tertiaire"),
                ],
                FakeEmbeddings(),
                Path(directory),
            )
            try:
                retriever = store.as_retriever(
                    search_type="mmr",
                    search_kwargs={"k": 2, "fetch_k": 3, "lambda_mult": 0.5},
                )
                results = retriever.invoke("question MMR fictive")
            finally:
                system = getattr(getattr(store, "_client", None), "_system", None)
                if system is not None:
                    system.stop()

        self.assertEqual(len(results), 2)
        self.assertTrue(all("document MMR fictif" in doc.page_content for doc in results))


if __name__ == "__main__":
    unittest.main()
