"use client";

import type { Product, IncomeEntry, ExpenseEntry, InventoryTransaction, InventoryTransactionType } from '@/lib/types';
import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Initial state with some sample data for development
const initialProducts: Product[] = [
  { id: uuidv4(), name: "Sách Kỹ Năng A", unit: "cuốn", initialStock: 10, costPrice: 50000, sellingPrice: 75000, currentStock: 10, imageUrl: "https://placehold.co/100x100.png?text=Sách+A", dataAiHint:"book skill" },
  { id: uuidv4(), name: "Nguyên liệu B", unit: "kg", initialStock: 25, costPrice: 20000, sellingPrice: 0, currentStock: 25, imageUrl: "https://placehold.co/100x100.png?text=NL+B", dataAiHint:"material ingredient" },
];

const initialIncomeEntries: IncomeEntry[] = [
  { id: uuidv4(), date: new Date(2024, 0, 15).toISOString(), amount: 5000000, category: "Lương", description: "Lương tháng 1" },
  { id: uuidv4(), date: new Date(2024, 0, 20).toISOString(), amount: 1200000, category: "Bán hàng", description: "Bán sách A" },
];

const initialExpenseEntries: ExpenseEntry[] = [
  { id: uuidv4(), date: new Date(2024, 0, 5).toISOString(), amount: 1500000, category: "Nhà ở", description: "Tiền thuê nhà" },
  { id: uuidv4(), date: new Date(2024, 0, 10).toISOString(), amount: 300000, category: "Thực phẩm", description: "Đi chợ" },
];

const initialInventoryTransactions: InventoryTransaction[] = [];


interface AppData {
  products: Product[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  inventoryTransactions: InventoryTransaction[];
}

interface AppContextType extends AppData {
  addProduct: (product: Omit<Product, 'id' | 'currentStock'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addIncomeEntry: (entry: Omit<IncomeEntry, 'id'>) => void;
  deleteIncomeEntry: (entryId: string) => void;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id'>) => void;
  deleteExpenseEntry: (entryId: string) => void;
  addInventoryTransaction: (transaction: Omit<InventoryTransaction, 'id'>) => string | null; // Returns error message or null
  getProductById: (productId: string) => Product | undefined;
  getProductStock: (productId: string) => number;
  getCategoryTotals: (type: 'income' | 'expense') => { name: string; value: number }[];
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
}

const DataContext = createContext<AppContextType | undefined>(undefined);

type Action =
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_INCOME'; payload: IncomeEntry }
  | { type: 'DELETE_INCOME'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: ExpenseEntry }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: InventoryTransaction };

const initialState: AppData = {
  products: initialProducts,
  incomeEntries: initialIncomeEntries,
  expenseEntries: initialExpenseEntries,
  inventoryTransactions: initialInventoryTransactions,
};

function dataReducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PRODUCT':
      // Also remove related inventory transactions. This is a simplification.
      // In a real app, you might prevent deletion if transactions exist or handle it differently.
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload),
        inventoryTransactions: state.inventoryTransactions.filter(t => t.productId !== action.payload),
      };
    case 'ADD_INCOME':
      return { ...state, incomeEntries: [...state.incomeEntries, action.payload] };
    case 'DELETE_INCOME':
      return { ...state, incomeEntries: state.incomeEntries.filter(i => i.id !== action.payload) };
    case 'ADD_EXPENSE':
      return { ...state, expenseEntries: [...state.expenseEntries, action.payload] };
    case 'DELETE_EXPENSE':
      return { ...state, expenseEntries: state.expenseEntries.filter(e => e.id !== action.payload) };
    case 'ADD_TRANSACTION':
      return { ...state, inventoryTransactions: [...state.inventoryTransactions, action.payload] };
    default:
      return state;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  const getProductStock = useCallback((productId: string): number => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return 0;

    let stock = product.initialStock;
    state.inventoryTransactions.forEach(transaction => {
      if (transaction.productId === productId) {
        if (transaction.type === 'import') {
          stock += transaction.quantity;
        } else {
          stock -= transaction.quantity;
        }
      }
    });
    return stock;
  }, [state.products, state.inventoryTransactions]);

  const addProduct = (productData: Omit<Product, 'id' | 'currentStock'>) => {
    const newProduct: Product = { 
      ...productData, 
      id: uuidv4(), 
      currentStock: productData.initialStock // Initial current stock is the initial stock
    };
    dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
  };

  const updateProduct = (productData: Product) => {
    // Recalculate currentStock in case initialStock was changed.
    // This is a simple approach; a more robust system might handle this differently.
    const currentStock = getProductStock(productData.id);
    const updatedProduct = { ...productData, currentStock };
    dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct });
  };
  
  const deleteProduct = (productId: string) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: productId });
  };

  const addIncomeEntry = (entryData: Omit<IncomeEntry, 'id'>) => {
    const newEntry: IncomeEntry = { ...entryData, id: uuidv4() };
    dispatch({ type: 'ADD_INCOME', payload: newEntry });
  };

  const deleteIncomeEntry = (entryId: string) => {
    dispatch({ type: 'DELETE_INCOME', payload: entryId });
  };

  const addExpenseEntry = (entryData: Omit<ExpenseEntry, 'id'>) => {
    const newEntry: ExpenseEntry = { ...entryData, id: uuidv4() };
    dispatch({ type: 'ADD_EXPENSE', payload: newEntry });
  };

  const deleteExpenseEntry = (entryId: string) => {
    dispatch({ type: 'DELETE_EXPENSE', payload: entryId });
  };

  const addInventoryTransaction = (transactionData: Omit<InventoryTransaction, 'id'>): string | null => {
    if (transactionData.type === 'export') {
      const currentStock = getProductStock(transactionData.productId);
      if (transactionData.quantity > currentStock) {
        return `Không đủ hàng tồn kho. Hiện có: ${currentStock}.`;
      }
    }
    const newTransaction: InventoryTransaction = { ...transactionData, id: uuidv4() };
    dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    return null; // Success
  };
  
  const getProductById = useCallback((productId: string) => {
    return state.products.find(p => p.id === productId);
  }, [state.products]);

  const getCategoryTotals = useCallback((type: 'income' | 'expense'): { name: string; value: number }[] => {
    const totals: { [key: string]: number } = {};
    const entries = type === 'income' ? state.incomeEntries : state.expenseEntries;

    entries.forEach(entry => {
      totals[entry.category] = (totals[entry.category] || 0) + entry.amount;
    });

    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [state.incomeEntries, state.expenseEntries]);

  const getTotalIncome = useCallback((): number => {
    return state.incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [state.incomeEntries]);

  const getTotalExpenses = useCallback((): number => {
    return state.expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [state.expenseEntries]);

  const productsWithCurrentStock = useMemo(() => {
    return state.products.map(product => ({
      ...product,
      currentStock: getProductStock(product.id)
    }));
  }, [state.products, getProductStock]);

  const value = {
    ...state,
    products: productsWithCurrentStock, // Provide products with updated currentStock
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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): AppContextType {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
