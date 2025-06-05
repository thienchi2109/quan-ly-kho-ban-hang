
"use client";

import type { Product, IncomeEntry, ExpenseEntry, InventoryTransaction, SalesOrder, OrderItem, SalesOrderStatus } from '@/lib/types';
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
  serverTimestamp, // For auto-generating order numbers or timestamps if needed
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
  addIncomeEntry: (entry: Omit<IncomeEntry, 'id'>) => Promise<string | undefined>;
  deleteIncomeEntry: (entryId: string) => Promise<void>;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id'>) => Promise<void>;
  deleteExpenseEntry: (entryId: string) => Promise<void>;
  addInventoryTransaction: (transaction: Omit<InventoryTransaction, 'id'>) => Promise<string | null>;
  getProductById: (productId: string) => Product | undefined;
  getProductStock: (productId: string) => number;
  getCategoryTotals: (type: 'income' | 'expense') => { name: string; value: number }[];
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
  addSalesOrder: (orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'totalAmount' | 'totalCost' | 'totalProfit'> & { items: Array<Omit<OrderItem, 'id' | 'totalPrice'>> }) => Promise<string | undefined>;
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
      toast({ title: "Thành công", description: "Đã thêm sản phẩm mới vào Firestore." });
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
      toast({ title: "Thành công", description: "Đã cập nhật sản phẩm." });
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
      
      const qSalesOrderItems = query(salesOrdersCol, where("items", "array-contains", { productId: productId }));
      // This query is not ideal for Firestore for deeply nested array checks.
      // A better approach might be to iterate salesOrders in client or use a different data model if this becomes a performance issue.
      // For now, we'll assume this check might be too complex or we skip deep deletion from sales orders.
      // Simpler: disallow deleting product if it's in any sales order.

      const batch = writeBatch(db);
      transactionDocs.forEach(docSnapshot => {
        batch.delete(doc(db, 'inventoryTransactions', docSnapshot.id));
      });
      batch.delete(doc(db, 'products', productId));
      await batch.commit();

      toast({ title: "Đã xóa", description: "Đã xóa sản phẩm và các giao dịch kho liên quan.", variant: "destructive" });
    } catch (e) {
      console.error("Error deleting product: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa sản phẩm.", variant: "destructive" });
      setError("Không thể xóa sản phẩm.");
    }
  };
  
  const addIncomeEntry = async (entryData: Omit<IncomeEntry, 'id'>): Promise<string | undefined> => {
    try {
      const docRef = await addDoc(incomeCol, entryData);
      toast({ title: "Thành công", description: "Đã thêm khoản thu nhập." });
      return docRef.id;
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
      toast({ title: "Đã xóa", description: "Đã xóa khoản thu nhập.", variant: "destructive" });
    } catch (e) {
      console.error("Error deleting income entry: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa khoản thu nhập.", variant: "destructive" });
      setError("Không thể xóa khoản thu nhập.");
    }
  };

  const addExpenseEntry = async (entryData: Omit<ExpenseEntry, 'id'>) => {
    try {
      await addDoc(expensesCol, entryData);
      toast({ title: "Thành công", description: "Đã thêm khoản chi tiêu." });
    } catch (e) {
      console.error("Error adding expense entry: ", e);
      toast({ title: "Lỗi", description: "Không thể thêm khoản chi tiêu.", variant: "destructive" });
      setError("Không thể thêm khoản chi tiêu.");
    }
  };

  const deleteExpenseEntry = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, 'expenseEntries', entryId));
      toast({ title: "Đã xóa", description: "Đã xóa khoản chi tiêu.", variant: "destructive" });
    } catch (e) {
      console.error("Error deleting expense entry: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa khoản chi tiêu.", variant: "destructive" });
      setError("Không thể xóa khoản chi tiêu.");
    }
  };

  const addInventoryTransaction = async (transactionData: Omit<InventoryTransaction, 'id'>): Promise<string | null> => {
    try {
      if (transactionData.type === 'export') {
        const currentStock = getProductStock(transactionData.productId);
        if (transactionData.quantity > currentStock) {
          const message = `Không đủ hàng tồn kho cho sản phẩm. Hiện có: ${currentStock}, cần xuất: ${transactionData.quantity}.`;
          toast({ title: "Lỗi xuất kho", description: message, variant: "destructive" });
          return message; // Return error message
        }
      }
      await addDoc(transactionsCol, transactionData);
      // Toast for inventory transaction is handled by calling function (e.g. addSalesOrder)
      return null; // Success
    } catch (e) {
      console.error("Error adding inventory transaction: ", e);
      const message = "Không thể ghi nhận giao dịch kho.";
      toast({ title: "Lỗi Giao Dịch Kho", description: message, variant: "destructive" });
      setError(message);
      return message; // Return error message
    }
  };

  const addSalesOrder = async (
    orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'totalAmount' | 'totalCost' | 'totalProfit'> & { items: Array<Omit<OrderItem, 'id' | 'totalPrice'>> }
  ): Promise<string | undefined> => {
    const batch = writeBatch(db);
    const newOrderRef = doc(collection(db, 'salesOrders')); // Generate new ID for SalesOrder

    try {
      // 1. Calculate totals and prepare order items
      let totalAmount = 0;
      let totalCost = 0;
      const processedItems: OrderItem[] = orderData.items.map((item, index) => {
        const product = productsWithCurrentStock.find(p => p.id === item.productId);
        if (!product) throw new Error(`Sản phẩm với ID ${item.productId} không tìm thấy.`);
        
        const currentCostPrice = product.costPrice || 0; // Use 0 if costPrice is undefined
        const itemTotalPrice = item.quantity * item.unitPrice;
        totalAmount += itemTotalPrice;
        totalCost += item.quantity * currentCostPrice;
        
        return {
          ...item,
          id: doc(collection(db, 'dummy')).id, // Temporary unique ID for React key, not stored if subcollection not used
          costPrice: currentCostPrice,
          totalPrice: itemTotalPrice,
        };
      });

      const totalProfit = totalAmount - totalCost;
      const orderNumber = `DH-${Date.now().toString().slice(-6)}`; // Simple order number generation

      const finalOrderData: SalesOrder = {
        ...orderData,
        id: newOrderRef.id,
        orderNumber,
        items: processedItems,
        totalAmount,
        totalCost,
        totalProfit,
        status: orderData.status || 'Mới', // Default status
      };

      batch.set(newOrderRef, finalOrderData);

      // 2. Create inventory transactions for each item
      for (const item of processedItems) {
        const transactionResult = await addInventoryTransaction({
          productId: item.productId,
          type: 'export',
          quantity: item.quantity,
          date: finalOrderData.date,
          relatedParty: finalOrderData.customerName || 'Khách lẻ',
          notes: `Xuất kho cho đơn hàng ${orderNumber}`,
          relatedOrderId: newOrderRef.id,
        });
        if (transactionResult !== null) { // Error in inventory transaction
          throw new Error(transactionResult); // This will be caught by the outer catch
        }
      }

      // 3. Create an income entry
      await addIncomeEntry({
        date: finalOrderData.date,
        amount: finalOrderData.totalAmount,
        category: 'Bán hàng',
        description: `Thu nhập từ đơn hàng ${orderNumber}`,
        relatedOrderId: newOrderRef.id,
      });
      
      // await batch.commit(); // Removed because addInventoryTransaction and addIncomeEntry already write.
      // If they were changed to use batch, this would be needed.
      // For now, addSalesOrder directly calls them which commit their own writes.
      // The sales order itself still needs to be written:
      await addDoc(salesOrdersCol, finalOrderData);


      toast({ title: "Thành công!", description: `Đã tạo đơn hàng ${orderNumber}.` });
      return newOrderRef.id;

    } catch (e: any) {
      console.error("Error adding sales order: ", e);
      toast({ title: "Lỗi Tạo Đơn Hàng", description: e.message || "Không thể tạo đơn hàng.", variant: "destructive" });
      setError(e.message || "Không thể tạo đơn hàng.");
      return undefined;
    }
  };
  
  const updateSalesOrderStatus = async (orderId: string, status: SalesOrderStatus) => {
    try {
      const orderRef = doc(db, 'salesOrders', orderId);
      await updateDoc(orderRef, { status });
      toast({ title: "Thành công", description: "Đã cập nhật trạng thái đơn hàng." });
    } catch (e) {
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
    salesOrders, // Added salesOrders
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
    addSalesOrder, // Added addSalesOrder
    updateSalesOrderStatus, // Added updateSalesOrderStatus
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
