
"use client";

import type { Product, IncomeEntry, ExpenseEntry, InventoryTransaction, SalesOrder, OrderItem, SalesOrderStatus, ExpenseCategory, PaymentMethod, OrderDataForPayment } from '@/lib/types'; // Added ExpenseCategory
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
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
    orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'totalProfit' | 'totalCost'>, // totalAmount is now original, finalAmount will be calculated
    isDraft: boolean
  ) => Promise<string | undefined>;
  updateSalesOrderStatus: (orderId: string, status: SalesOrderStatus) => Promise<void>;
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

  const getProductStock = useCallback((productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    let stock = product.initialStock || 0;
    inventoryTransactions.forEach(transaction => {
      if (transaction.productId === productId) {
        if (transaction.type === 'import') {
          stock += transaction.quantity;
        } else if (transaction.type === 'export') {
          stock -= transaction.quantity;
        }
      }
    });
    return stock;
  }, [products, inventoryTransactions]);

  const productsWithCurrentStock = useMemo(() => {
    return products.map(product => ({
      ...product,
      currentStock: getProductStock(product.id)
    }));
  }, [products, getProductStock]);

  const addProduct = async (productData: Omit<Product, 'id' | 'currentStock'>) => {
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
    try {
      const { id, currentStock, ...dataToUpdate } = productData;
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, dataToUpdate);
    } catch (e) {
      console.error("Error updating product: ", e);
      toast({ title: "Lỗi", description: "Không thể cập nhật sản phẩm.", variant: "destructive" });
      setError("Không thể cập nhật sản phẩm.");
    }
  };

  const deleteProduct = async (productId: string) => {
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
    try {
      await deleteDoc(doc(db, 'incomeEntries', entryId));
    } catch (e) {
      console.error("Error deleting income entry: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa khoản thu nhập.", variant: "destructive" });
      setError("Không thể xóa khoản thu nhập.");
    }
  };

  const addExpenseEntry = async (entryData: Omit<ExpenseEntry, 'id'>, batch?: ReturnType<typeof writeBatch>): Promise<string | undefined> => {
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
    try {
      await deleteDoc(doc(db, 'expenseEntries', entryId));
    } catch (e) {
      console.error("Error deleting expense entry: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa khoản chi tiêu.", variant: "destructive" });
      setError("Không thể xóa khoản chi tiêu.");
    }
  };

  const addInventoryTransaction = async (transactionData: Omit<InventoryTransaction, 'id'>, currentBatch?: ReturnType<typeof writeBatch>): Promise<string | null> => {
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
    const localBatch = writeBatch(db);
    const newOrderRef = doc(collection(db, 'salesOrders'));

    try {
      // totalAmount is the original sum of item.totalPrice
      // finalAmount includes discount and otherIncome, to be calculated and passed in orderData if available
      // totalCost is sum of item.costPrice * quantity
      // totalProfit will be finalAmount - totalCost

      let calculatedTotalCost = 0;
      const processedItems: OrderItem[] = orderData.items.map((item) => {
        const product = productsWithCurrentStock.find(p => p.id === item.productId);
        if (!product) throw new Error(`Sản phẩm với ID ${item.productId} không tìm thấy.`);
        const currentCostPrice = product.costPrice || 0;
        calculatedTotalCost += item.quantity * currentCostPrice;
        return {
          ...item, // Should already include productName, quantity, unitPrice, costPrice
          id: doc(collection(db, 'dummy')).id, // Generate temp id for sub-collection like items
          totalPrice: item.quantity * item.unitPrice, // Ensure totalPrice is correctly calculated here
        };
      });

      const finalAmountForDB = orderData.finalAmount ?? orderData.totalAmount; // Use finalAmount if provided, else original totalAmount
      const calculatedTotalProfit = finalAmountForDB - calculatedTotalCost;
      const orderNumber = `DH-${Date.now().toString().slice(-6)}`;

      const finalOrderDataToSave: SalesOrder = {
        ...orderData, // Includes customerName, date, items, notes, discountPercentage, otherIncomeAmount, paymentMethod etc from form
        id: newOrderRef.id,
        orderNumber,
        items: processedItems, // Use processed items with correct totalPrice and costPrice
        totalAmount: orderData.totalAmount, // Original total amount from items
        finalAmount: finalAmountForDB,
        totalCost: calculatedTotalCost,
        totalProfit: calculatedTotalProfit,
        status: orderData.status || 'Mới', // Default to 'Mới' if not provided, this will be updated later if payment is confirmed
      };

      localBatch.set(newOrderRef, finalOrderDataToSave);

      // Always create export transactions
      for (const item of processedItems) {
        const transactionResult = await addInventoryTransaction({
          productId: item.productId,
          type: 'export',
          quantity: item.quantity,
          date: finalOrderDataToSave.date,
          relatedParty: finalOrderDataToSave.customerName || 'Khách lẻ',
          notes: `Xuất kho cho đơn hàng ${orderNumber}`,
          relatedOrderId: newOrderRef.id,
        }, localBatch);
        if (transactionResult !== null) {
          throw new Error(transactionResult);
        }
      }

      if (!isDraft) {
        // Record income and COGS only if not a draft (i.e., payment process initiated)
        await addIncomeEntry({
          date: finalOrderDataToSave.date,
          amount: finalOrderDataToSave.finalAmount, // Income is based on the final amount paid
          category: 'Bán hàng',
          description: `Thu nhập từ đơn hàng ${orderNumber}`,
          relatedOrderId: newOrderRef.id,
        }, localBatch);

        if (finalOrderDataToSave.totalCost > 0) {
          await addExpenseEntry({
              date: finalOrderDataToSave.date,
              amount: finalOrderDataToSave.totalCost,
              category: 'Giá vốn hàng bán' as ExpenseCategory,
              description: `Giá vốn cho đơn hàng ${finalOrderDataToSave.orderNumber}`,
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

  const updateSalesOrderStatus = async (orderId: string, status: SalesOrderStatus) => {
    const localBatch = writeBatch(db);
    const orderRef = doc(db, 'salesOrders', orderId);

    try {
        const orderToUpdate = salesOrders.find(o => o.id === orderId);
        if (!orderToUpdate) {
            throw new Error("Không tìm thấy đơn hàng để cập nhật.");
        }

        localBatch.update(orderRef, { status });
        await localBatch.commit();
        toast({ title: "Thành công", description: `Đã cập nhật trạng thái đơn hàng thành ${status}.` });
    } catch (e: any) {
        console.error("Error updating sales order status: ", e);
        toast({ title: "Lỗi", description: "Không thể cập nhật trạng thái đơn hàng.", variant: "destructive" });
        setError("Không thể cập nhật trạng thái đơn hàng.");
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

