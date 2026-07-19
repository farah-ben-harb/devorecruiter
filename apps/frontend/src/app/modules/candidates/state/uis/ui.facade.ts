import { inject, Injectable, signal } from '@angular/core';
import { BrowserUiService } from '@core/services/browser-ui.service';
import { ModalConfig } from '@shared/models/shared.model';
import { environment } from '@env/environment';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
  visible: boolean;
}

@Injectable()
export class UiFacade {
  private readonly browserUi = inject(BrowserUiService);

  readonly toast = signal<Toast>({ message: '', type: 'info', visible: false });
  readonly dialogConfig = signal<ModalConfig | null>(null);
  readonly dialogVisible = signal(false);
  readonly showInvalidFileModal = signal(false);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Toast ─────────────────────────────────────────────────────────────────

  showToast(message: string, type: ToastType, duration = environment.toastDurationMs): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type, visible: true });
    this.toastTimer = setTimeout(() => this.hideToast(), duration);
  }

  hideToast(): void {
    this.toast.update((t) => ({ ...t, visible: false }));
  }

  toastSuccess(message: string): void {
    this.showToast(message, 'success');
  }

  // ── Dialog ────────────────────────────────────────────────────────────────

  openDialog(config: ModalConfig): void {
    this.dialogConfig.set(config);
    this.dialogVisible.set(true);
    this.browserUi.addBodyClass('modal-open');
  }

  confirmDialog(): void {
    this.dialogConfig()?.onConfirm?.();
    this.closeDialog();
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.dialogConfig.set(null);
    this.browserUi.removeBodyClass('modal-open');
  }

  dialogError(title: string, message: string): void {
    this.openDialog({ type: 'error', title, message, confirmText: 'OK' });
  }

  // ── Invalid file modal ────────────────────────────────────────────────────

  closeInvalidFileModal(): void {
    this.showInvalidFileModal.set(false);
  }

  destroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }
}
