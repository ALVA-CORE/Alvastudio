import { useSyncExternalStore } from "react";
import {
  EMPTY_WALLET,
  MOCK_WALLET,
  type IdentityState,
  type PayoutAccount,
  type Wallet,
} from "@/data/contributors/wallet";

/**
 * One wallet, shared by every screen that shows it.
 *
 * The dashboard and the profile both read identity state, and holding it in
 * each component's `useState` meant verifying from one left the other still
 * asking. That is a bug a reviewer would find in ten seconds and not worth
 * shipping a demo with.
 *
 * Module state behind `useSyncExternalStore` rather than a context, because
 * the shape it is standing in for is a fetch: when `GET /wallet` is wired this
 * file becomes the cache and nothing above it changes.
 */

/**
 * `emptyIdentity` is tracked apart from the seeded wallet's, because the dev
 * empty-state switch is a different simulated account: it has to start
 * unverified so the gate can be looked at, and verifying from there has to
 * stick for the same reason verifying from the real one does.
 */
let current: Wallet = MOCK_WALLET;
let emptyIdentity: IdentityState = "unverified";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWallet(): Wallet {
  return useSyncExternalStore(subscribe, () => current);
}

export function setPayoutAccount(account: PayoutAccount) {
  current = { ...current, payoutAccount: account };
  emit();
}

export function setIdentityState(identity: IdentityState, isEmpty = false) {
  if (isEmpty) emptyIdentity = identity;
  else current = { ...current, identity };
  emit();
}

/** Dev-only empty-state switch, driven by `useDevUiState`. */
export function useWalletFace(isEmpty: boolean): Wallet {
  const wallet = useWallet();
  const empty = useSyncExternalStore(subscribe, () => emptyIdentity);
  return isEmpty ? { ...EMPTY_WALLET, identity: empty } : wallet;
}

/** Test seam — module state outlives a render. */
export function __resetWallet() {
  current = MOCK_WALLET;
  emptyIdentity = "unverified";
  emit();
}
