import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: products } = await api.get<Product[]>('/products')
      const { data: stock } = await api.get<Stock[]>('/stock')

      const existingProduct = cart.find(product => product.id === productId)

      if (!existingProduct) {
        const product = products.find(item => item.id === productId)
        if (!product) return
        
        const newCart = [...cart, { ...product, amount: 1 }]

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        setCart(newCart)
        
        return
      }

      const hasInStock = stock.find(item => item.id === productId)?.amount || 0 >= existingProduct.amount + 1

      if (!hasInStock) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = [...cart.filter(item => item.id !== productId), { ...existingProduct, amount: (existingProduct.amount || 0) + 1 }]
      console.log({newCart})

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(item => item.id !== productId)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const product = cart.find(item => item.id === productId)
      if (!product) return

      const { data: stock } = await api.get<Stock[]>('/stock')

      const hasInStock = stock.find(item => item.id === productId)?.amount || 0 >= amount

      if (!hasInStock) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = [...cart.filter(item => item.id !== productId), { ...product, amount }]

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
