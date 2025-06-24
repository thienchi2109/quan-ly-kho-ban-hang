
"use client";

import type { Product, IncomeEntry, ExpenseEntry, InventoryTransaction, SalesOrder, OrderItem, SalesOrderStatus, ExpenseCategory, PaymentMethod, OrderDataForPayment, OrderEditHistory } from '@/lib/types'; // Added ExpenseCategory
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs,
  where,
  serverTimestamp,
  setDoc,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import type { SalesOrderFormValues } from '@/app/sales/orders/page';

interface AppData {
  products: Product[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  inventoryTransactions: InventoryTransaction[];
  salesOrders: SalesOrder[];
  loading: {
    products: boolean;
    income: boolean;
    expenses: boolean;
    transactions: boolean;
    salesOrders: boolean;
  };
  error: string | null;
}

interface AppContextType extends Omit<AppData, 'loading' | 'error'> {
  addProduct: (product: Omit<Product, 'id' | 'currentStock'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addIncomeEntry: (entry: Omit<IncomeEntry, 'id'>, batch?: ReturnType<typeof writeBatch>) => Promise<string | undefined>;
  deleteIncomeEntry: (entryId: string) => Promise<void>;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id'>, batch?: ReturnType<typeof writeBatch>) => Promise<string | undefined>;
  deleteExpenseEntry: (entryId: string) => Promise<void>;
  addInventoryTransaction: (transaction: Omit<InventoryTransaction, 'id'>, currentBatch?: ReturnType<typeof writeBatch>) => Promise<string | null>;
  getProductById: (productId: string) => Product | undefined;
  getProductStock: (productId: string) => number;
  getCategoryTotals: (type: 'income' | 'expense') => { name: string; value: number }[];
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
  addSalesOrder: (
    orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'totalProfit' | 'totalCost'>, 
    isDraft: boolean
  ) => Promise<string | undefined>;
  updateSalesOrderStatus: (orderId: string, newStatus: SalesOrderStatus) => Promise<void>;
  updateSalesOrder: (orderId: string, updatedData: SalesOrderFormValues, reason: string) => Promise<void>; // New function
  isLoading: boolean;
}

const DataContext = createContext<AppContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    products: true,
    income: true,
    expenses: true,
    transactions: true,
    salesOrders: true,
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const overallLoading = useMemo(() => {
    return Object.values(loadingStates).some(state => state === true);
  }, [loadingStates]);

  const productsCol = collection(db, 'products');
  const incomeCol = collection(db, 'incomeEntries');
  const expensesCol = collection(db, 'expenseEntries');
  const transactionsCol = collection(db, 'inventoryTransactions');
  const salesOrdersCol = collection(db, 'salesOrders');

  useEffect(() => {
    const qProducts = query(productsCol, orderBy("name"));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoadingStates(prev => ({ ...prev, products: false }));
    }, (err) => {
      console.error("Error fetching products:", err);
      setError("Không thể tải dữ liệu sản phẩm.");
      setLoadingStates(prev => ({ ...prev, products: false }));
    });

    const qIncome = query(incomeCol, orderBy("date", "desc"));
    const unsubscribeIncome = onSnapshot(qIncome, (snapshot) => {
      setIncomeEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as IncomeEntry)));
      setLoadingStates(prev => ({ ...prev, income: false }));
    }, (err) => {
      console.error("Error fetching income entries:", err);
      setError("Không thể tải dữ liệu thu nhập.");
      setLoadingStates(prev => ({ ...prev, income: false }));
    });

    const qExpenses = query(expensesCol, orderBy("date", "desc"));
    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenseEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseEntry)));
      setLoadingStates(prev => ({ ...prev, expenses: false }));
    }, (err) => {
      console.error("Error fetching expense entries:", err);
      setError("Không thể tải dữ liệu chi tiêu.");
      setLoadingStates(prev => ({ ...prev, expenses: false }));
    });

    const qTransactions = query(transactionsCol, orderBy("date", "desc"));
    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      setInventoryTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction)));
      setLoadingStates(prev => ({ ...prev, transactions: false }));
    }, (err) => {
      console.error("Error fetching inventory transactions:", err);
      setError("Không thể tải dữ liệu giao dịch kho.");
      setLoadingStates(prev => ({ ...prev, transactions: false }));
    });

    const qSalesOrders = query(salesOrdersCol, orderBy("date", "desc"));
    const unsubscribeSalesOrders = onSnapshot(qSalesOrders, (snapshot) => {
      setSalesOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SalesOrder)));
      setLoadingStates(prev => ({ ...prev, salesOrders: false }));
    }, (err) => {
      console.error("Error fetching sales orders:", err);
      setError("Không thể tải dữ liệu đơn hàng bán.");
      setLoadingStates(prev => ({ ...prev, salesOrders: false }));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeIncome();
      unsubscribeExpenses();
      unsubscribeTransactions();
      unsubscribeSalesOrders();
    };
  }, []);

  // Optimized transaction summary calculation
  const transactionSummary = useMemo(() => {
    const summary = new Map<string, { imports: number; exports: number }>();
    inventoryTransactions.forEach(t => {
      const current = summary.get(t.productId) ?? { imports: 0, exports: 0 };
      if (t.type === 'import') {
        current.imports += t.quantity;
      } else if (t.type === 'export') {
        current.exports += t.quantity;
      }
      summary.set(t.productId, current);
    });
    return summary;
  }, [inventoryTransactions]);

  // Optimized product stock calculation using the summary
  const productsWithCurrentStock = useMemo(() => {
    return products.map(product => {
      const summary = transactionSummary.get(product.id);
      const stock = (product.initialStock || 0) + (summary?.imports || 0) - (summary?.exports || 0);
      return {
        ...product,
        currentStock: stock,
      };
    });
  }, [products, transactionSummary]);

  // Optimized getProductStock function
  const getProductStock = useCallback((productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    const summary = transactionSummary.get(productId);
    return (product.initialStock || 0) + (summary?.imports || 0) - (summary?.exports || 0);
  }, [products, transactionSummary]);

  const addProduct = async (productData: Omit<Product, 'id' | 'currentStock'>) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    try {
      const dataToSave = { ...productData };
      await addDoc(productsCol, dataToSave);
    } catch (e) {
      console.error("Error adding product: ", e);
      toast({ title: "Lỗi", description: "Không thể thêm sản phẩm.", variant: "destructive" });
      setError("Không thể thêm sản phẩm.");
    }
  };

  const updateProduct = async (productData: Product) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    try {
      const { id, currentStock, ...dataToUpdate } = productData;
      
      // Sanitize the object to remove undefined fields before sending to Firestore
      const sanitizedData = Object.fromEntries(
        Object.entries(dataToUpdate).filter(([, value]) => value !== undefined)
      );
      
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, sanitizedData);
    } catch (e) {
      console.error("Error updating product: ", e);
      toast({ title: "Lỗi", description: "Không thể cập nhật sản phẩm.", variant: "destructive" });
      setError("Không thể cập nhật sản phẩm.");
    }
  };

  const deleteProduct = async (productId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    try {
      const qTransactions = query(transactionsCol, where("productId", "==", productId));
      const transactionDocs = await getDocs(qTransactions);

      const batch = writeBatch(db);
      transactionDocs.forEach(docSnapshot => {
        batch.delete(doc(db, 'inventoryTransactions', docSnapshot.id));
      });
      batch.delete(doc(db, 'products', productId));
      await batch.commit();
    } catch (e) {
      console.error("Error deleting product: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa sản phẩm.", variant: "destructive" });
      setError("Không thể xóa sản phẩm.");
    }
  };

  const addIncomeEntry = async (entryData: Omit<IncomeEntry, 'id'>, batch?: ReturnType<typeof writeBatch>): Promise<string | undefined> => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    try {
      const newIncomeRef = doc(collection(db, 'incomeEntries'));
      if (batch) {
        batch.set(newIncomeRef, entryData);
      } else {
        await setDoc(newIncomeRef, entryData);
      }
      return newIncomeRef.id;
    } catch (e) {
      console.error("Error adding income entry: ", e);
      toast({ title: "Lỗi", description: "Không thể thêm khoản thu nhập.", variant: "destructive" });
      setError("Không thể thêm khoản thu nhập.");
      return undefined;
    }
  };

  const deleteIncomeEntry = async (entryId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'incomeEntries', entryId));
    } catch (e) {
      console.error("Error deleting income entry: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa khoản thu nhập.", variant: "destructive" });
      setError("Không thể xóa khoản thu nhập.");
    }
  };

  const addExpenseEntry = async (entryData: Omit<ExpenseEntry, 'id'>, batch?: ReturnType<typeof writeBatch>): Promise<string | undefined> => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    try {
      const newExpenseRef = doc(collection(db, 'expenseEntries'));
      if (batch) {
        batch.set(newExpenseRef, entryData);
      } else {
        await setDoc(newExpenseRef, entryData);
      }
      return newExpenseRef.id;
    } catch (e) {
      console.error("Error adding expense entry: ", e);
      toast({ title: "Lỗi", description: "Không thể thêm khoản chi tiêu.", variant: "destructive" });
      setError("Không thể thêm khoản chi tiêu.");
      return undefined;
    }
  };

  const deleteExpenseEntry = async (entryId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'expenseEntries', entryId));
    } catch (e) {
      console.error("Error deleting expense entry: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa khoản chi tiêu.", variant: "destructive" });
      setError("Không thể xóa khoản chi tiêu.");
    }
  };

  const addInventoryTransaction = async (transactionData: Omit<InventoryTransaction, 'id'>, currentBatch?: ReturnType<typeof writeBatch>): Promise<string | null> => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      const message = "Bạn không có quyền thực hiện hành động này.";
      toast({ title: "Không có quyền", description: message, variant: "destructive" });
      return message;
    }
    try {
      if (transactionData.type === 'export') {
        const currentStock = getProductStock(transactionData.productId);
        if (transactionData.quantity > currentStock) {
          const message = `Không đủ hàng tồn kho cho sản phẩm. Hiện có: ${currentStock}, cần xuất: ${transactionData.quantity}.`;
          return message;
        }
      }
      const newTransactionRef = doc(collection(db, 'inventoryTransactions'));
      if (currentBatch) {
        currentBatch.set(newTransactionRef, transactionData);
      } else {
        await setDoc(newTransactionRef, transactionData);
      }
      return null; // Success
    } catch (e: any) {
      console.error("Error adding inventory transaction: ", e);
      const message = "Không thể ghi nhận giao dịch kho.";
      return e.message || message;
    }
  };

  const addSalesOrder = async (
    orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'totalProfit' | 'totalCost'>,
    isDraft: boolean
  ): Promise<string | undefined> => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    const localBatch = writeBatch(db);
    const newOrderRef = doc(collection(db, 'salesOrders'));

    try {
      for (const item of orderData.items) {
        const productExists = productsWithCurrentStock.find(p => p.id === item.productId);
        if (!productExists) {
          throw new Error(`Sản phẩm "${item.productName || 'không xác định'}" (ID: ${item.productId}) không tìm thấy hoặc đã bị xóa. Vui lòng kiểm tra lại đơn hàng.`);
        }
      }
      
      let calculatedTotalCost = 0;
      const processedItems: OrderItem[] = orderData.items.map((item) => {
        const product = productsWithCurrentStock.find(p => p.id === item.productId);
        // We already checked for product existence above, so product should be defined here
        const currentCostPrice = product!.costPrice || 0;
        calculatedTotalCost += item.quantity * currentCostPrice;
        return {
          ...item,
          id: doc(collection(db, 'dummy')).id, 
          totalPrice: item.quantity * item.unitPrice,
          costPrice: currentCostPrice, // Ensure costPrice is set from product
        };
      });

      const finalAmountForDB = orderData.finalAmount ?? orderData.totalAmount;
      const calculatedTotalProfit = finalAmountForDB - calculatedTotalCost;
      const orderNumber = `DH-${Date.now().toString().slice(-6)}`;

      const dataToSave: SalesOrder = {
        id: newOrderRef.id,
        orderNumber,
        date: orderData.date,
        items: processedItems,
        totalAmount: orderData.totalAmount,
        finalAmount: finalAmountForDB, // finalAmount is defined
        totalCost: calculatedTotalCost,
        totalProfit: calculatedTotalProfit,
        status: orderData.status || 'Mới',
        // Conditionally add optional fields to prevent 'undefined' values
        ...(orderData.customerName && orderData.customerName.trim() !== '' && { customerName: orderData.customerName }),
        ...(orderData.notes && orderData.notes.trim() !== '' && { notes: orderData.notes }),
        ...(orderData.discountPercentage !== undefined && { discountPercentage: orderData.discountPercentage }), // Allows 0
        ...(orderData.directDiscountAmount !== undefined && { directDiscountAmount: orderData.directDiscountAmount }),
        ...(orderData.otherIncomeAmount !== undefined && { otherIncomeAmount: orderData.otherIncomeAmount }), // Allows 0
        ...(orderData.paymentMethod && { paymentMethod: orderData.paymentMethod }), // paymentMethod is optional in SalesOrder type
        ...(orderData.cashReceived !== undefined && { cashReceived: orderData.cashReceived }),
        ...(orderData.changeGiven !== undefined && { changeGiven: orderData.changeGiven }),
      };
      
      localBatch.set(newOrderRef, dataToSave);

      if (!isDraft) { // Only create related transactions if it's not a draft order being saved
        for (const item of processedItems) {
          const transactionResult = await addInventoryTransaction({
            productId: item.productId,
            type: 'export',
            quantity: item.quantity,
            date: dataToSave.date,
            relatedParty: dataToSave.customerName || 'Khách lẻ',
            notes: `Xuất kho cho đơn hàng ${orderNumber}`,
            relatedOrderId: newOrderRef.id,
          }, localBatch);
          if (transactionResult !== null) {
            throw new Error(transactionResult);
          }
        }

        await addIncomeEntry({
          date: dataToSave.date,
          amount: dataToSave.finalAmount,
          category: 'Bán hàng',
          description: `Thu nhập từ đơn hàng ${orderNumber}`,
          relatedOrderId: newOrderRef.id,
        }, localBatch);

        if (dataToSave.totalCost > 0) {
          await addExpenseEntry({
              date: dataToSave.date,
              amount: dataToSave.totalCost,
              category: 'Giá vốn hàng bán' as ExpenseCategory,
              description: `Giá vốn cho đơn hàng ${dataToSave.orderNumber}`,
              relatedOrderId: newOrderRef.id,
              receiptImageUrl: '',
          }, localBatch);
        }
      }

      await localBatch.commit();
      return newOrderRef.id;

    } catch (e: any) {
      console.error("Error adding sales order: ", e);
      toast({ title: "Lỗi Tạo Đơn Hàng", description: e.message || "Không thể tạo đơn hàng.", variant: "destructive" });
      setError(e.message || "Không thể tạo đơn hàng.");
      return undefined;
    }
  };

  const updateSalesOrderStatus = async (orderId: string, newStatus: SalesOrderStatus) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'demo') {
      toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
      return;
    }
    const localBatch = writeBatch(db);
    const orderRef = doc(db, 'salesOrders', orderId);
    let orderToUpdate = salesOrders.find(o => o.id === orderId);

    try {
      if (!orderToUpdate) {
        // Attempt to refetch if not found in local state (though onSnapshot should keep it up-to-date)
        const orderSnapshot = await getDocs(query(salesOrdersCol, where("id", "==", orderId)));
        if (!orderSnapshot.empty) {
            orderToUpdate = { id: orderSnapshot.docs[0].id, ...orderSnapshot.docs[0].data() } as SalesOrder;
        } else {
            throw new Error("Không tìm thấy đơn hàng để cập nhật.");
        }
      }
      
      const oldStatus = orderToUpdate.status;
      localBatch.update(orderRef, { status: newStatus });

      if (newStatus === 'Hoàn thành' && oldStatus !== 'Hoàn thành') {
        // Logic to create transactions and financial entries IF THEY DON'T EXIST YET
        // Check if income entry already exists for this order
        const incomeQuery = query(incomeCol, where("relatedOrderId", "==", orderId));
        const existingIncomeEntries = await getDocs(incomeQuery);
        if (existingIncomeEntries.empty) {
          await addIncomeEntry({
            date: orderToUpdate.date,
            amount: orderToUpdate.finalAmount || orderToUpdate.totalAmount,
            category: 'Bán hàng',
            description: `Thu nhập từ đơn hàng ${orderToUpdate.orderNumber}`,
            relatedOrderId: orderId,
          }, localBatch);
        }

        // Check if COGS expense entry already exists
        const cogsQuery = query(expensesCol, where("relatedOrderId", "==", orderId), where("category", "==", "Giá vốn hàng bán"));
        const existingCogsEntries = await getDocs(cogsQuery);
        if (existingCogsEntries.empty && orderToUpdate.totalCost > 0) {
           await addExpenseEntry({
            date: orderToUpdate.date,
            amount: orderToUpdate.totalCost,
            category: 'Giá vốn hàng bán',
            description: `Giá vốn cho đơn hàng ${orderToUpdate.orderNumber}`,
            relatedOrderId: orderId,
            receiptImageUrl: '',
          }, localBatch);
        }
        
        // Check and create export transactions for items if not already present
        for (const item of orderToUpdate.items) {
          const product = productsWithCurrentStock.find(p => p.id === item.productId);
          if (!product) {
            console.warn(`Sản phẩm ID ${item.productId} không tìm thấy khi hoàn thành đơn hàng ${orderId}. Bỏ qua giao dịch kho cho sản phẩm này.`);
            continue;
          }
          const exportQuery = query(transactionsCol, 
            where("relatedOrderId", "==", orderId), 
            where("productId", "==", item.productId),
            where("type", "==", "export")
          );
          const existingExports = await getDocs(exportQuery);
          if (existingExports.empty) { // Only add if no export transaction for this item in this order exists
            const transactionResult = await addInventoryTransaction({
              productId: item.productId,
              type: 'export',
              quantity: item.quantity,
              date: orderToUpdate.date,
              relatedParty: orderToUpdate.customerName || 'Khách lẻ',
              notes: `Xuất kho tự động khi hoàn thành đơn hàng ${orderToUpdate.orderNumber}`,
              relatedOrderId: orderId,
            }, localBatch);
            if (transactionResult !== null) {
              // Log or handle minor error, but don't necessarily stop the whole status update
              console.error(`Lỗi tạo giao dịch xuất kho cho ${item.productName}: ${transactionResult}`);
              toast({ title: "Cảnh báo", description: `Không thể tạo giao dịch xuất kho cho ${item.productName}: ${transactionResult}`, variant: "default"});
            }
          }
        }

      } else if (newStatus === 'Đã hủy' && oldStatus === 'Hoàn thành') {
        // Reverse transactions and financial entries
        for (const item of orderToUpdate.items) {
          const product = productsWithCurrentStock.find(p => p.id === item.productId);
          if (!product) {
            console.warn(`Sản phẩm ID ${item.productId} không tìm thấy khi hủy đơn hàng ${orderId}. Bỏ qua hoàn kho cho sản phẩm này.`);
            continue;
          }
          await addInventoryTransaction({ // Create import transaction to reverse export
            productId: item.productId,
            type: 'import',
            quantity: item.quantity,
            date: orderToUpdate.date,
            relatedParty: 'Hủy đơn hàng',
            notes: `Hoàn kho do hủy đơn hàng ${orderToUpdate.orderNumber}`,
            relatedOrderId: orderId,
          }, localBatch);
        }
        // Delete related income entries
        const incomeQuery = query(incomeCol, where("relatedOrderId", "==", orderId));
        const incomeDocs = await getDocs(incomeQuery);
        incomeDocs.forEach(docSnapshot => localBatch.delete(doc(db, 'incomeEntries', docSnapshot.id)));
        
        // Delete related COGS expense entries
        const cogsQuery = query(expensesCol, where("relatedOrderId", "==", orderId), where("category", "==", "Giá vốn hàng bán"));
        const cogsDocs = await getDocs(cogsQuery);
        cogsDocs.forEach(docSnapshot => localBatch.delete(doc(db, 'expenseEntries', docSnapshot.id)));
      }

      await localBatch.commit();
      toast({ title: "Thành công", description: `Đã cập nhật trạng thái đơn hàng thành ${newStatus}.` });
    } catch (e: any) {
        console.error("Error updating sales order status: ", e);
        toast({ title: "Lỗi", description: e.message || "Không thể cập nhật trạng thái đơn hàng.", variant: "destructive" });
        setError(e.message || "Không thể cập nhật trạng thái đơn hàng.");
    }
  };

  const updateSalesOrder = async (orderId: string, updatedData: SalesOrderFormValues, reason: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'demo')) {
        toast({ title: "Không có quyền", description: "Bạn không có quyền thực hiện hành động này.", variant: "destructive" });
        return;
    }
    const batch = writeBatch(db);
    const orderRef = doc(db, "salesOrders", orderId);

    try {
        const originalOrderDoc = await getDoc(orderRef);
        if (!originalOrderDoc.exists()) {
            throw new Error("Không tìm thấy đơn hàng gốc.");
        }
        const originalOrder = originalOrderDoc.data() as SalesOrder;
        
        const { editHistory, ...previousState } = originalOrder;
        const newHistoryEntry: OrderEditHistory = {
            timestamp: serverTimestamp(),
            userEmail: currentUser.email,
            reason,
            previousState,
        };

        // Recalculate totals based on updated items
        const newTotalAmount = updatedData.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
        const newTotalCost = updatedData.items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + (Number(item.quantity) * (product?.costPrice || 0));
        }, 0);
        const finalAmount = updatedData.finalAmount ?? newTotalAmount;
        const newTotalProfit = finalAmount - newTotalCost;

        // Inventory adjustment logic
        originalOrder.items.forEach(oldItem => {
            const newItem = updatedData.items.find(i => i.productId === oldItem.productId);
            const quantityChange = (newItem ? Number(newItem.quantity) : 0) - oldItem.quantity;

            if (quantityChange !== 0) {
                const transactionData = {
                    productId: oldItem.productId,
                    type: quantityChange > 0 ? 'export' : 'import' as 'export' | 'import',
                    quantity: Math.abs(quantityChange),
                    date: updatedData.date,
                    relatedParty: 'Điều chỉnh đơn hàng',
                    notes: `Điều chỉnh đơn hàng ${originalOrder.orderNumber} (Lý do: ${reason})`,
                    relatedOrderId: orderId,
                };
                const newTransactionRef = doc(collection(db, "inventoryTransactions"));
                batch.set(newTransactionRef, transactionData);
            }
        });
        
        // Update financial entries
        const incomeQuery = query(collection(db, 'incomeEntries'), where("relatedOrderId", "==", orderId));
        const incomeDocs = await getDocs(incomeQuery);
        incomeDocs.forEach(doc => batch.update(doc.ref, { amount: finalAmount }));
        
        const cogsQuery = query(collection(db, 'expenseEntries'), where("relatedOrderId", "==", orderId), where("category", "==", "Giá vốn hàng bán"));
        const cogsDocs = await getDocs(cogsQuery);
        cogsDocs.forEach(doc => batch.update(doc.ref, { amount: newTotalCost }));


        const processedItems: OrderItem[] = updatedData.items.map((item) => {
          const product = productsWithCurrentStock.find(p => p.id === item.productId);
          return {
            ...item,
            id: doc(collection(db, 'dummy')).id, 
            totalPrice: item.quantity * item.unitPrice,
            costPrice: product?.costPrice || 0,
          };
        });

        // Update the order itself
        batch.update(orderRef, {
            ...updatedData,
            items: processedItems,
            totalAmount: newTotalAmount,
            totalCost: newTotalCost,
            totalProfit: newTotalProfit,
            finalAmount: finalAmount,
            editHistory: arrayUnion(newHistoryEntry),
        });

        await batch.commit();
        toast({ title: "Thành công", description: "Đã cập nhật đơn hàng." });
    } catch (e: any) {
        console.error("Error updating sales order:", e);
        toast({ title: "Lỗi", description: e.message || "Không thể cập nhật đơn hàng.", variant: "destructive" });
    }
  };


  const getProductById = useCallback((productId: string) => {
    return productsWithCurrentStock.find(p => p.id === productId);
  }, [productsWithCurrentStock]);

  const getCategoryTotals = useCallback((type: 'income' | 'expense'): { name: string; value: number }[] => {
    const totals: { [key: string]: number } = {};
    const entries = type === 'income' ? incomeEntries : expenseEntries;
    entries.forEach(entry => {
      totals[entry.category] = (totals[entry.category] || 0) + entry.amount;
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [incomeEntries, expenseEntries]);

  const getTotalIncome = useCallback((): number => {
    return incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [incomeEntries]);

  const getTotalExpenses = useCallback((): number => {
    return expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [expenseEntries]);

  const value: AppContextType = {
    products: productsWithCurrentStock,
    incomeEntries,
    expenseEntries,
    inventoryTransactions,
    salesOrders,
    addProduct,
    updateProduct,
    deleteProduct,
    addIncomeEntry,
    deleteIncomeEntry,
    addExpenseEntry,
    deleteExpenseEntry,
    addInventoryTransaction,
    getProductById,
    getProductStock,
    getCategoryTotals,
    getTotalIncome,
    getTotalExpenses,
    addSalesOrder,
    updateSalesOrderStatus,
    updateSalesOrder,
    isLoading: overallLoading,
  };

  useEffect(() => {
    if (error) {
      toast({ title: "Lỗi dữ liệu", description: error, variant: "destructive" });
      setError(null);
    }
  }, [error, toast]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): AppContextType {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
