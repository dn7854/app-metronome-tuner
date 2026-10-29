import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import { Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from "@expo-google-fonts/outfit";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configurePurchases, purchasesConfigured } from "./src/purchases";
import { Shell } from "./src/Shell";
import { dropLockedSelection, hydratePractice, usePractice } from "./src/store";
import { colors } from "./src/theme";

export default function App() {
  const [booted, setBooted] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      await hydratePractice();
      if (purchasesConfigured()) {
        try {
          const premium = await configurePurchases();
          if (live) usePractice.getState().setPremium(premium);
        } catch {
          // keep the last known entitlement if the store is offline
        }
      }
      if (live) {
        dropLockedSelection();
        setBooted(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if ((!fontsLoaded && !fontError) || !booted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brass} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Shell />
    </SafeAreaProvider>
  );
}
