import '@angular/compiler';
import 'zone.js';
import 'zone.js/testing';

/// <reference types="vitest/globals" />

import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { beforeAll } from 'vitest'; // ← ajoute ça si erreur persiste

// Précharge les templates Angular (important pour les components)
beforeAll(async () => {
  await resolveComponentResources(() =>
    Promise.resolve({
      text: () => Promise.resolve(''),
    } as Response),
  );
});

// Initialise Angular testing environment
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
