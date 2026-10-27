import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MODES, SOUNDS } from "../lib/theory";
import { purchasePremium, purchasesConfigured, restorePremium } from "../purchases";
import { colors, fonts } from "../theme";

function cancelled(error: unknown) {
  return Boolean(error && typeof error === "object" && "userCancelled" in error && (error as { userCancelled?: boolean }).userCancelled);
}

export function Paywall({
  onClose,
  onUnlock,
}: {
  onClose: () => void;
  onUnlock: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sounds = SOUNDS.filter((item) => item.isPremium).map((item) => item.label);
  const meters = MODES.filter((item) => item.isPremium).map((item) => item.label);
  const configured = purchasesConfigured();

  async function buy() {
    setError(null);
    if (!configured) {
      if (__DEV__) {
        onUnlock();
        return;
      }
      setError("Add the RevenueCat keys, then rebuild. See the README.");
      return;
    }
    setBusy("buy");
    try {
      const ok = await purchasePremium();
      if (ok) onUnlock();
      else setError("The store did not unlock the practice kit.");
    } catch (err) {
      if (!cancelled(err)) setError(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setError(null);
    if (!configured) {
      setError("Restore needs the RevenueCat keys.");
      return;
    }
    setBusy("restore");
    try {
      const ok = await restorePremium();
      if (ok) onUnlock();
      else setError("No previous purchase was found for this store account.");
    } catch (err) {
      if (!cancelled(err)) setError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, justifyContent: "flex-end" }}>
      <Pressable accessibilityLabel="Close purchase" onPress={onClose} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(16,14,12,0.82)" }} />
      <View
        style={{
          margin: 12,
          marginBottom: Math.max(12, insets.bottom + 8),
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          padding: 20,
          gap: 10,
        }}
      >
        <Text style={{ fontFamily: fonts.sansMed, letterSpacing: 2, fontSize: 12, color: colors.brass }}>PRACTICE KIT</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 48, color: colors.fg }}>$2.99</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted }}>
          One purchase. Extra knocks, and the meters that do not fit in four-four.
        </Text>
        <Text style={{ fontFamily: fonts.sans, color: colors.fg }}>Sounds · {sounds.join(", ")}</Text>
        <Text style={{ fontFamily: fonts.sans, color: colors.fg }}>Meters · {meters.join(", ")}</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.muted }}>
          App Store and Google Play bill this through RevenueCat as aurel_premium_299, entitlement premium.
          {configured ? "" : " Keys are not in this build yet."}
          {__DEV__ && !configured ? " Developer unlock is local only." : ""}
        </Text>
        {error ? <Text style={{ fontFamily: fonts.sans, color: colors.brass }}>{error}</Text> : null}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Pressable
            onPress={onClose}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.sansMed, color: colors.fg }}>Not now</Text>
          </Pressable>
          <Pressable
            onPress={() => void buy()}
            disabled={busy !== null}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.brass,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {busy === "buy" ? (
              <ActivityIndicator color={colors.brassInk} />
            ) : (
              <Text style={{ fontFamily: fonts.sansSemi, color: colors.brassInk }}>
                {configured ? "Unlock" : __DEV__ ? "Dev unlock" : "Unlock"}
              </Text>
            )}
          </Pressable>
        </View>
        <Pressable onPress={() => void restore()} disabled={busy !== null} style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.sansMed, color: colors.muted }}>{busy === "restore" ? "Restoring…" : "Restore purchase"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
