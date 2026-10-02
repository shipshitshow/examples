import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';

// Set in app.json expo.extra or via EAS environment
const RC_API_KEY_IOS = process.env['EXPO_PUBLIC_RC_API_KEY_IOS'] ?? '';
const RC_API_KEY_ANDROID = process.env['EXPO_PUBLIC_RC_API_KEY_ANDROID'] ?? '';

export const PRO_ENTITLEMENT_ID = 'pro';

let initialized = false;

export function initializePurchases(userId?: string): void {
  if (initialized) return;

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!apiKey) return;

  void Purchases.setLogLevel(LOG_LEVEL.ERROR);
  void Purchases.configure({ apiKey });

  if (userId) {
    void Purchases.logIn(userId);
  }

  initialized = true;
}

export async function loginToPurchases(userId: string): Promise<void> {
  if (!initialized) return;
  await Purchases.logIn(userId);
}

export async function logoutFromPurchases(): Promise<void> {
  if (!initialized) return;
  await Purchases.logOut();
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function isProSubscriber(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return PRO_ENTITLEMENT_ID in info.entitlements.active;
}

export async function purchaseProPackage(offering: PurchasesOffering): Promise<boolean> {
  const proPackage = offering.availablePackages[0];
  if (!proPackage) return false;

  try {
    const { customerInfo } = await Purchases.purchasePackage(proPackage);
    return PRO_ENTITLEMENT_ID in customerInfo.entitlements.active;
  } catch (err: unknown) {
    // User cancelled — not an error
    const e = err as { userCancelled?: boolean };
    if (e.userCancelled) return false;
    throw err;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return PRO_ENTITLEMENT_ID in info.entitlements.active;
  } catch {
    return false;
  }
}
