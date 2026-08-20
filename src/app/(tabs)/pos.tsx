import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Crypto from "expo-crypto";
import { useIsFocused } from "expo-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AppScreen } from "@/components/app-screen";
import {
  InventoryButton,
  InventoryCard,
  InventoryEmpty,
  InventoryField,
  InventoryHeader,
  InventoryLoading,
} from "@/components/inventory-ui";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { formatMoney } from "@/lib/inventory-domain";
import {
  addPosCartItem,
  calculateCashCheckout,
  calculateSaleTotal,
  parsePosInput,
  type PosCartItem,
} from "@/lib/pos-domain";
import {
  assertCanSwitchPosMode,
  returnReasonLabels,
  returnReasons,
  validateReturnDetails,
  type ReturnCondition,
  type ReturnReason,
} from "@/lib/return-domain";

type PosMode = "return" | "sale";

type ReturnProduct = {
  canMarkDamaged: boolean;
  categoryCode: string;
  categoryName: string;
  originalSellingPriceMinor: number;
  originalSoldAt: number;
  saleItemId: Id<"saleItems">;
  saleNumber: number;
  sku: string;
  unitId: Id<"inventoryUnits">;
};

export default function PosScreen() {
  const convex = useConvex();
  const isFocused = useIsFocused();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const currentDay = useQuery(api.pos.getCurrentBusinessDay);
  const completeCashSale = useMutation(api.pos.completeCashSale);
  const completeCashReturn = useMutation(api.pos.completeCashReturn);
  const closeCurrentBusinessDay = useMutation(api.pos.closeCurrentBusinessDay);
  const saleRequestKey = useRef(Crypto.randomUUID());
  const returnRequestKey = useRef(Crypto.randomUUID());
  const closeRequestKey = useRef(Crypto.randomUUID());
  const lookupLock = useRef(false);
  const scanLock = useRef(false);
  const cartRef = useRef<PosCartItem[]>([]);
  const [mode, setMode] = useState<PosMode>("sale");
  const [manualInput, setManualInput] = useState("");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [cashTendered, setCashTendered] = useState("");
  const [returnProduct, setReturnProduct] = useState<ReturnProduct | null>(null);
  const [returnCondition, setReturnCondition] = useState<ReturnCondition>("resalable");
  const [returnReason, setReturnReason] = useState<ReturnReason>("changed_mind");
  const [returnNote, setReturnNote] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [returning, setReturning] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [confirmingSale, setConfirmingSale] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "error" | "success";
    message: string;
    title: string;
  } | null>(null);

  if (!shopContext || currentDay === undefined) {
    return <AppScreen><InventoryLoading /></AppScreen>;
  }

  const currencyCode = shopContext.shop.currencyCode;
  let cartTotalMinor: number | null = null;
  try {
    cartTotalMinor = calculateSaleTotal(
      cart.map((item) => item.sellingPrice),
      currencyCode,
    ).totalMinor;
  } catch {
    cartTotalMinor = null;
  }

  let changeMinor: number | null = null;
  try {
    changeMinor = calculateCashCheckout(
      cart.map((item) => item.sellingPrice),
      cashTendered,
      currencyCode,
    ).changeMinor;
  } catch {
    changeMinor = null;
  }
  const busy = checkingOut || returning;

  const addProduct = async (input: string) => {
    if (lookupLock.current) return;
    lookupLock.current = true;
    setLookingUp(true);
    try {
      const sku = parsePosInput(input);
      if (mode === "return") {
        const result = await convex.query(api.pos.lookupSoldUnitForReturn, {
          input: sku,
        });
        setReturnProduct(result);
        setReturnCondition("resalable");
        setReturnReason("changed_mind");
        setReturnNote("");
      } else {
        const result = await convex.query(api.pos.lookupUnit, { input: sku });
        const nextCart = addPosCartItem(cartRef.current, {
          categoryCode: result.categoryCode,
          categoryName: result.categoryName,
          sellingPrice: "",
          sku: result.sku,
          unitId: result.unitId,
        });
        cartRef.current = nextCart;
        setCart(nextCart);
      }
      setManualInput("");
      setNotice(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again.";
      setNotice({
        kind: "error",
        message:
          mode === "sale" && message.includes("not available for sale")
            ? `${message} Switch to Return mode to process a sold product.`
            : message,
        title: mode === "sale" ? "Product not added" : "Return not started",
      });
    } finally {
      lookupLock.current = false;
      setLookingUp(false);
    }
  };

  const openScanner = async () => {
    try {
      const permission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();
      if (!permission.granted) {
        setNotice({
          kind: "error",
          message: "Allow camera access to scan labels, or use manual SKU entry below.",
          title: "Camera permission required",
        });
        return;
      }
      setScannerOpen(true);
      setNotice(null);
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Use manual SKU entry instead.",
        title: "Scanner unavailable",
      });
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanLocked(true);
    try {
      await addProduct(result.data);
      setScannerOpen(false);
    } finally {
      scanLock.current = false;
      setScanLocked(false);
    }
  };

  const updatePrice = (unitId: string, sellingPrice: string) => {
    setCart((items) => {
      const nextCart = items.map((item) =>
        item.unitId === unitId ? { ...item, sellingPrice } : item,
      );
      cartRef.current = nextCart;
      return nextCart;
    });
  };

  const checkout = async () => {
    try {
      const calculated = calculateCashCheckout(
        cart.map((item) => item.sellingPrice),
        cashTendered,
        currencyCode,
      );
      setCheckingOut(true);
      const receipt = await completeCashSale({
        cashTenderedMinor: calculated.cashTenderedMinor,
        items: cart.map((item, index) => ({
          inventoryUnitId: item.unitId as Id<"inventoryUnits">,
          sellingPriceMinor: calculated.sellingPricesMinor[index],
        })),
        requestKey: saleRequestKey.current,
      });
      saleRequestKey.current = Crypto.randomUUID();
      cartRef.current = [];
      setCart([]);
      setCashTendered("");
      setConfirmingSale(false);
      setNotice({
        kind: "success",
        message: `${receipt.unitCount} products sold for ${formatMoney(receipt.totalMinor, currencyCode)}. Change: ${formatMoney(receipt.changeMinor, currencyCode)}.`,
        title: `Sale ${String(receipt.saleNumber).padStart(4, "0")} complete`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Try again.",
        title: "Sale not completed",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const switchMode = (nextMode: PosMode) => {
    if (nextMode === mode) return;
    try {
      if (nextMode === "return") assertCanSwitchPosMode(cartRef.current.length);
      setMode(nextMode);
      setManualInput("");
      setReturnProduct(null);
      setReturnCondition("resalable");
      setReturnReason("changed_mind");
      setReturnNote("");
      setConfirmingReturn(false);
      setConfirmingSale(false);
      setScannerOpen(false);
      setNotice(null);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Try again.",
        title: "Cannot switch mode",
      });
    }
  };

  const confirmReturn = () => {
    try {
      validateReturnDetails(returnReason, returnNote);
      setScannerOpen(false);
      setConfirmingReturn(true);
      setNotice(null);
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Try again.",
        title: "Return details required",
      });
    }
  };

  const submitReturn = async () => {
    if (!returnProduct) return;
    try {
      const details = validateReturnDetails(returnReason, returnNote);
      setReturning(true);
      const receipt = await completeCashReturn({
        condition: returnCondition,
        ...details,
        requestKey: returnRequestKey.current,
        saleItemId: returnProduct.saleItemId,
      });
      returnRequestKey.current = Crypto.randomUUID();
      setReturnProduct(null);
      setReturnCondition("resalable");
      setReturnReason("changed_mind");
      setReturnNote("");
      setConfirmingReturn(false);
      setNotice({
        kind: "success",
        message:
          receipt.condition === "resalable"
            ? `${receipt.sku} is back in stock. Refund ${formatMoney(receipt.refundAmountMinor, currencyCode)} in cash.`
            : `${receipt.sku} is marked damaged and cannot be sold. Refund ${formatMoney(receipt.refundAmountMinor, currencyCode)} in cash.`,
        title: "Return complete",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Try again.",
        title: "Return not completed",
      });
    } finally {
      setReturning(false);
    }
  };

  const closeDay = async () => {
    setClosingDay(true);
    try {
      const result = await closeCurrentBusinessDay({
        requestKey: closeRequestKey.current,
      });
      closeRequestKey.current = Crypto.randomUUID();
      setConfirmingClose(false);
      setNotice({
        kind: "success",
        message: `${result.saleCount} sales and ${result.returnCount} returns. Gross sales: ${formatMoney(result.grossSalesMinor, currencyCode)}. Refunds: ${formatMoney(result.cashRefundedMinor, currencyCode)}. Net cash: ${formatMoney(result.netCashMinor, currencyCode)}. Adjusted gross profit: ${formatMoney(result.adjustedGrossProfitMinor, currencyCode)}. Day ${result.nextDayNumber} is now open.`,
        title: `Day ${result.closedDayNumber} closed`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Try again.",
        title: "Business day not closed",
      });
    } finally {
      setClosingDay(false);
    }
  };

  const confirmCloseDay = () => {
    setConfirmingClose(true);
  };

  return (
    <AppScreen>
      <InventoryHeader
        description={
          mode === "sale"
            ? "Scan permanent SKUs, set negotiated prices, and complete one cash transaction."
            : "Scan one sold SKU, record its condition and reason, and refund its original cash price."
        }
        eyebrow="POINT OF SALE"
        title={mode === "sale" ? "Cash sale" : "Product return"}
      />

      {notice ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            notice.kind === "error" ? styles.noticeError : styles.noticeSuccess,
          ]}>
          <View style={styles.noticeCopy}>
            <ThemedText type="smallBold">{notice.title}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {notice.message}
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel="Dismiss message"
            accessibilityRole="button"
            onPress={() => setNotice(null)}>
            <MaterialCommunityIcons
              color={Colors.light.textSecondary}
              name="close"
              size={22}
            />
          </Pressable>
        </View>
      ) : null}

      <InventoryCard>
        <ThemedText type="subtitle">Transaction mode</ThemedText>
        <View style={styles.modeActions}>
          <InventoryButton
            icon="cart-outline"
            label="Sale"
            onPress={() => switchMode("sale")}
            secondary={mode !== "sale"}
          />
          <InventoryButton
            icon="cash-refund"
            label="Return"
            onPress={() => switchMode("return")}
            secondary={mode !== "return"}
          />
        </View>
      </InventoryCard>

      <InventoryCard>
        <View style={styles.sectionHeading}>
          <ThemedText type="subtitle">
            {currentDay ? `Business day ${currentDay.dayNumber}` : "First business day"}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {currentDay
              ? `${currentDay.saleCount} sales · ${formatMoney(currentDay.grossSalesMinor, currencyCode)} gross · ${currentDay.returnCount} returns · ${formatMoney(currentDay.cashRefundedMinor, currencyCode)} refunded`
              : "Day 1 opens automatically with the first transaction."}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {currentDay ? `Net cash: ${formatMoney(currentDay.netCashMinor, currencyCode)}` : null}
          </ThemedText>
        </View>
      </InventoryCard>

      <InventoryCard>
        <ThemedText type="subtitle">
          1. {mode === "sale" ? "Add products" : "Find sold product"}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Scan the label with this device, enter the printed SKU, or paste the QR payload.
        </ThemedText>
        <View style={styles.scannerActions}>
          <InventoryButton
            disabled={busy}
            icon="qrcode-scan"
            label={scannerOpen ? "Scanner open" : "Scan QR"}
            onPress={() => void openScanner()}
            secondary={scannerOpen}
          />
          {scannerOpen ? (
            <InventoryButton
              icon="close"
              label="Close scanner"
              onPress={() => setScannerOpen(false)}
              secondary
            />
          ) : null}
        </View>
        {scannerOpen && isFocused && cameraPermission?.granted ? (
          <View style={styles.cameraShell}>
            <CameraView
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              enableTorch={torchEnabled}
              facing="back"
              onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
              onMountError={(event) => {
                setScannerOpen(false);
                setNotice({
                  kind: "error",
                  message: event.message,
                  title: "Scanner unavailable",
                });
              }}
              style={styles.camera}
            />
            <View pointerEvents="none" style={styles.scanFrame} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setTorchEnabled((enabled) => !enabled)}
              style={({ pressed }) => [styles.torchButton, pressed && styles.pressed]}>
              <MaterialCommunityIcons
                color={Colors.light.surface}
                name={torchEnabled ? "flashlight-off" : "flashlight"}
                size={22}
              />
              <ThemedText style={styles.torchText} type="smallBold">
                {torchEnabled ? "Torch off" : "Torch on"}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.lookupRow}>
          <View style={styles.lookupField}>
            <InventoryField
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              label="SKU or QR payload"
              onChangeText={setManualInput}
              onSubmitEditing={() => void addProduct(manualInput)}
              placeholder="SHT-20260820-0001-001"
              returnKeyType="search"
              value={manualInput}
            />
          </View>
          <InventoryButton
            disabled={!manualInput.trim() || busy}
            icon={mode === "sale" ? "plus" : "magnify"}
            label={mode === "sale" ? "Add" : "Find sold item"}
            loading={lookingUp}
            onPress={() => void addProduct(manualInput)}
          />
        </View>
      </InventoryCard>

      {mode === "sale" ? (
        <>
      <View style={styles.section}>
        <ThemedText type="subtitle">2. Cart ({cart.length})</ThemedText>
        <InventoryCard>
          {cart.length === 0 ? (
            <InventoryEmpty
              description="Scan a label or enter a SKU to start this sale."
              icon="cart-outline"
              title="Cart is empty"
            />
          ) : (
            cart.map((item, index) => (
              <View key={item.unitId}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.cartRow}>
                  <View style={styles.cartCopy}>
                    <View style={styles.categoryBadge}>
                      <ThemedText style={styles.categoryCode} type="smallBold">
                        {item.categoryCode}
                      </ThemedText>
                    </View>
                    <View style={styles.cartIdentity}>
                      <ThemedText type="smallBold">{item.categoryName}</ThemedText>
                      <ThemedText type="code">{item.sku}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.priceField}>
                    <InventoryField
                      editable={!checkingOut}
                      inputMode="decimal"
                      label={`Selling price (${currencyCode})`}
                      onChangeText={(value) => updatePrice(item.unitId, value)}
                      placeholder="450.00"
                      value={item.sellingPrice}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${item.sku}`}
                    accessibilityRole="button"
                    disabled={checkingOut}
                    onPress={() => {
                      const nextCart = cartRef.current.filter(
                        (candidate) => candidate.unitId !== item.unitId,
                      );
                      cartRef.current = nextCart;
                      setCart(nextCart);
                    }}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                    <MaterialCommunityIcons
                      color={Colors.light.textSecondary}
                      name="delete-outline"
                      size={22}
                    />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </InventoryCard>
      </View>

      <InventoryCard>
        <ThemedText type="subtitle">3. Take cash</ThemedText>
        <View style={styles.totalRow}>
          <ThemedText themeColor="textSecondary">Sale total</ThemedText>
          <ThemedText type="subtitle">
            {cartTotalMinor === null
              ? "—"
              : formatMoney(cartTotalMinor, currencyCode)}
          </ThemedText>
        </View>
        <InventoryField
          editable={!checkingOut}
          inputMode="decimal"
          label={`Cash received (${currencyCode})`}
          onChangeText={setCashTendered}
          placeholder="500.00"
          value={cashTendered}
        />
        <View style={styles.totalRow}>
          <ThemedText themeColor="textSecondary">Change</ThemedText>
          <ThemedText type="subtitle">
            {changeMinor === null ? "—" : formatMoney(changeMinor, currencyCode)}
          </ThemedText>
        </View>
        <InventoryButton
          disabled={changeMinor === null}
          icon="cash-check"
          label="Complete cash sale"
          onPress={() => {
            setScannerOpen(false);
            setConfirmingSale(true);
          }}
        />
        {confirmingSale && cartTotalMinor !== null && changeMinor !== null ? (
          <View style={styles.confirmation}>
            <ThemedText type="smallBold">Confirm this cash sale?</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {cart.length} products · {formatMoney(cartTotalMinor, currencyCode)} total · {formatMoney(changeMinor, currencyCode)} change
            </ThemedText>
            <View style={styles.confirmationActions}>
              <InventoryButton
                icon="cash-check"
                label="Confirm sale"
                loading={checkingOut}
                onPress={() => void checkout()}
              />
              <InventoryButton
                label="Cancel"
                onPress={() => setConfirmingSale(false)}
                secondary
              />
            </View>
          </View>
        ) : null}
      </InventoryCard>

        </>
      ) : (
        <InventoryCard>
          <ThemedText type="subtitle">2. Review return</ThemedText>
          {!returnProduct ? (
            <InventoryEmpty
              description="Scan a sold label or enter its permanent SKU to begin one return."
              icon="cash-refund"
              title="No sold product selected"
            />
          ) : (
            <>
              <View style={styles.returnIdentity}>
                <View style={styles.categoryBadge}>
                  <ThemedText style={styles.categoryCode} type="smallBold">
                    {returnProduct.categoryCode}
                  </ThemedText>
                </View>
                <View style={styles.cartIdentity}>
                  <ThemedText type="smallBold">{returnProduct.categoryName}</ThemedText>
                  <ThemedText type="code">{returnProduct.sku}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Sale {String(returnProduct.saleNumber).padStart(4, "0")} · {new Date(returnProduct.originalSoldAt).toLocaleString()}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.totalRow}>
                <ThemedText themeColor="textSecondary">Cash refund</ThemedText>
                <ThemedText type="subtitle">
                  {formatMoney(returnProduct.originalSellingPriceMinor, currencyCode)}
                </ThemedText>
              </View>

              <View style={styles.sectionHeading}>
                <ThemedText type="smallBold">Product condition</ThemedText>
                <View style={styles.modeActions}>
                  <InventoryButton
                    icon="package-variant-closed-check"
                    label="Resalable"
                    onPress={() => setReturnCondition("resalable")}
                    secondary={returnCondition !== "resalable"}
                  />
                  {returnProduct.canMarkDamaged ? (
                    <InventoryButton
                      icon="package-variant-closed-remove"
                      label="Damaged"
                      onPress={() => setReturnCondition("damaged")}
                      secondary={returnCondition !== "damaged"}
                    />
                  ) : null}
                </View>
                <ThemedText themeColor="textSecondary" type="small">
                  {returnCondition === "resalable"
                    ? "The same SKU becomes available for sale again."
                    : "The SKU remains unavailable and is recorded as damaged."}
                </ThemedText>
                {!returnProduct.canMarkDamaged ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    Only an owner or manager can mark a returned product as damaged.
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.sectionHeading}>
                <ThemedText type="smallBold">Return reason</ThemedText>
                <View style={styles.reasonGrid}>
                  {returnReasons.map((reason) => {
                    const selected = returnReason === reason;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={reason}
                        onPress={() => setReturnReason(reason)}
                        style={({ pressed }) => [
                          styles.reasonOption,
                          selected && styles.reasonOptionSelected,
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText
                          style={selected ? styles.reasonTextSelected : undefined}
                          type="smallBold">
                          {returnReasonLabels[reason]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <InventoryField
                editable={!returning}
                label={returnReason === "other" ? "Return note (required)" : "Return note (optional)"}
                maxLength={500}
                multiline
                onChangeText={setReturnNote}
                placeholder="Add details for the audit trail."
                value={returnNote}
              />
              <InventoryButton
                disabled={returning}
                icon="cash-refund"
                label="Review cash return"
                onPress={confirmReturn}
              />

              {confirmingReturn ? (
                <View style={styles.confirmation}>
                  <ThemedText type="smallBold">Confirm this cash return?</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Refund {formatMoney(returnProduct.originalSellingPriceMinor, currencyCode)} · {returnCondition === "resalable" ? "Return to stock" : "Mark damaged"} · {returnReasonLabels[returnReason]}
                  </ThemedText>
                  <View style={styles.confirmationActions}>
                    <InventoryButton
                      icon="cash-refund"
                      label="Confirm return"
                      loading={returning}
                      onPress={() => void submitReturn()}
                    />
                    <InventoryButton
                      label="Cancel"
                      onPress={() => setConfirmingReturn(false)}
                      secondary
                    />
                  </View>
                </View>
              ) : null}
            </>
          )}
        </InventoryCard>
      )}

      {currentDay?.canCloseDay ? (
        <InventoryCard>
          <ThemedText type="subtitle">End Day</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Finalize today’s totals and immediately open the next business day.
          </ThemedText>
          <InventoryButton
            disabled={(currentDay.saleCount === 0 && currentDay.returnCount === 0) || cart.length > 0 || returning}
            label="End current day"
            loading={closingDay}
            onPress={confirmCloseDay}
            secondary
          />
          {confirmingClose ? (
            <View style={styles.confirmation}>
              <ThemedText type="smallBold">End current business day?</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                This freezes sales, refunds, and net cash, then opens the next business day.
              </ThemedText>
              <View style={styles.confirmationActions}>
                <InventoryButton
                  label="Confirm End Day"
                  loading={closingDay}
                  onPress={() => void closeDay()}
                />
                <InventoryButton
                  label="Cancel"
                  onPress={() => setConfirmingClose(false)}
                  secondary
                />
              </View>
            </View>
          ) : null}
          {cart.length > 0 ? (
            <ThemedText themeColor="textSecondary" type="small">
              Complete or clear the current cart before ending the day.
            </ThemedText>
          ) : null}
        </InventoryCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.four },
  sectionHeading: { gap: Spacing.two },
  notice: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  noticeError: { backgroundColor: "#FDECEC", borderColor: "#D92D20" },
  noticeSuccess: { backgroundColor: Colors.light.primaryMuted, borderColor: Colors.light.primary },
  noticeCopy: { flex: 1, gap: Spacing.one },
  lookupRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  lookupField: { flexBasis: 320, flexGrow: 1 },
  scannerActions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  cameraShell: {
    backgroundColor: "#000000",
    borderRadius: Radius.large,
    height: 300,
    overflow: "hidden",
    position: "relative",
  },
  camera: { height: "100%", width: "100%" },
  scanFrame: {
    alignSelf: "center",
    borderColor: Colors.light.surface,
    borderRadius: Radius.medium,
    borderWidth: 3,
    height: 190,
    position: "absolute",
    top: 42,
    width: 190,
  },
  torchButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: Radius.pill,
    bottom: Spacing.three,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    position: "absolute",
  },
  torchText: { color: Colors.light.surface },
  divider: { backgroundColor: Colors.light.border, height: 1, marginVertical: Spacing.three },
  cartRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  cartCopy: {
    alignItems: "center",
    flexBasis: 300,
    flexDirection: "row",
    flexGrow: 1,
    gap: Spacing.three,
    minHeight: 52,
  },
  categoryBadge: {
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    minWidth: 54,
    padding: Spacing.three,
  },
  categoryCode: { color: Colors.light.primary, textAlign: "center" },
  cartIdentity: { flex: 1, gap: Spacing.one },
  priceField: { flexBasis: 190, flexGrow: 1 },
  removeButton: {
    alignItems: "center",
    borderColor: Colors.light.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  pressed: { opacity: 0.7 },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmation: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.medium,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  confirmationActions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  modeActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  reasonOption: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  reasonOptionSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  reasonTextSelected: { color: Colors.light.surface },
  returnIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
});
