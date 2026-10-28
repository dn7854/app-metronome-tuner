import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

/** RevenueCat entitlement and the non-consumable the stores should sell for $2.99. */
export const ENTITLEMENT = "d8r_premium_299";
export const PRODUCT_ID = "d8r_premium_299";

function apiKey() {
  if (Platform.OS === "ios") return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  if (Platform.OS === "android") return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return "";
}

export function purchasesConfigured() {
  return apiKey().length > 0;
}

export async function configurePurchases() {
  const key = apiKey();
  if (!key) return false;
  Purchases.configure({ apiKey: key });
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[ENTITLEMENT] != null;
}

function pickPackage(packages: PurchasesPackage[]) {
  return (
    packages.find((pkg) => pkg.product.identifier === PRODUCT_ID) ??
    packages.find((pkg) => pkg.identifier === PRODUCT_ID) ??
    packages[0]
  );
}

export async function purchasePremium() {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const pkg = pickPackage(packages);
  if (!pkg) throw new Error("No current offering. Add d8r_premium_299 in RevenueCat.");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT] != null;
}

export async function restorePremium() {
  const info = await Purchases.restorePurchases();
  return info.entitlements.active[ENTITLEMENT] != null;
}
