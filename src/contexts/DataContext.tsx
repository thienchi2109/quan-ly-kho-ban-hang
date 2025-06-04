
"use client";

import type { Product, IncomeEntry, ExpenseEntry, InventoryTransaction } from '@/lib/types';
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
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast'; // Đảm bảo import useToast

interface AppData {
  products: Product[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  inventoryTransactions: InventoryTransaction[];
  loading: {
    products: boolean;
    income: boolean;
    expenses: boolean;
    transactions: boolean;
  };
  error: string | null;
}

interface AppContextType extends Omit<AppData, 'loading' | 'error'> {
  addProduct: (product: Omit<Product, 'id' | 'currentStock'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addIncomeEntry: (entry: Omit<IncomeEntry, 'id'>) => Promise<void>;
  deleteIncomeEntry: (entryId: string) => Promise<void>;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id'>) => Promise<void>;
  deleteExpenseEntry: (entryId: string) => Promise<void>;
  addInventoryTransaction: (transaction: Omit<InventoryTransaction, 'id'>) => Promise<string | null>;
  getProductById: (productId: string) => Product | undefined;
  getProductStock: (productId: string) => number;
  getCategoryTotals: (type: 'income' | 'expense') => { name: string; value: number }[];
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
  isLoading: boolean; // Trạng thái loading tổng thể
}

const DataContext = createContext<AppContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    products: true,
    income: true,
    expenses: true,
    transactions: true,
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const overallLoading = useMemo(() => {
    return Object.values(loadingStates).some(state => state === true);
  }, [loadingStates]);

  // Firestore collection references
  const productsCol = collection(db, 'products');
  const incomeCol = collection(db, 'incomeEntries');
  const expensesCol = collection(db, 'expenseEntries');
  const transactionsCol = collection(db, 'inventoryTransactions');

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

    return () => {
      unsubscribeProducts();
      unsubscribeIncome();
      unsubscribeExpenses();
      unsubscribeTransactions();
    };
  }, []);

  const getProductStock = useCallback((productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;

    let stock = product.initialStock || 0; // Mặc định initialStock là 0 nếu không có
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
      // currentStock không lưu vào Firestore, nó sẽ được tính toán
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
      const { id, currentStock, ...dataToUpdate } = productData; // Không lưu currentStock
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
      // Trước khi xóa sản phẩm, xóa tất cả giao dịch kho liên quan
      const q = query(transactionsCol, where("productId", "==", productId));
      const transactionDocs = await getDocs(q);
      
      const batch = writeBatch(db);
      transactionDocs.forEach(docSnapshot => {
        batch.delete(doc(db, 'inventoryTransactions', docSnapshot.id));
      });
      batch.delete(doc(db, 'products', productId)); // Xóa sản phẩm
      await batch.commit();

      toast({ title: "Đã xóa", description: "Đã xóa sản phẩm và các giao dịch liên quan.", variant: "destructive" });
    } catch (e) {
      console.error("Error deleting product: ", e);
      toast({ title: "Lỗi", description: "Không thể xóa sản phẩm.", variant: "destructive" });
      setError("Không thể xóa sản phẩm.");
    }
  };
  
  const addIncomeEntry = async (entryData: Omit<IncomeEntry, 'id'>) => {
    try {
      await addDoc(incomeCol, entryData);
      toast({ title: "Thành công", description: "Đã thêm khoản thu nhập." });
    } catch (e) {
      console.error("Error adding income entry: ", e);
      toast({ title: "Lỗi", description: "Không thể thêm khoản thu nhập.", variant: "destructive" });
      setError("Không thể thêm khoản thu nhập.");
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
          const message = `Không đủ hàng tồn kho. Hiện có: ${currentStock}.`;
          toast({ title: "Lỗi xuất kho", description: message, variant: "destructive" });
          return message;
        }
      }
      await addDoc(transactionsCol, transactionData);
      toast({ title: "Thành công", description: "Đã ghi nhận giao dịch kho." });
      return null;
    } catch (e) {
      console.error("Error adding inventory transaction: ", e);
      const message = "Không thể ghi nhận giao dịch kho.";
      toast({ title: "Lỗi", description: message, variant: "destructive" });
      setError(message);
      return message;
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
    isLoading: overallLoading,
  };

  // Hiển thị lỗi nếu có
  useEffect(() => {
    if (error) {
      toast({ title: "Lỗi dữ liệu", description: error, variant: "destructive" });
      setError(null); // Reset lỗi sau khi hiển thị
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
