import React from 'react';
import { motion } from 'motion/react';
import { List, Plus, Trash2, Edit } from 'lucide-react';
import { StarRating } from './AdminHelpers';
import { useLanguage } from '../../../context/LanguageContext';

interface AdminProductsProps {
  products: any[];
  theme: string;
  setShowAddCategory: (show: boolean) => void;
  setShowAddProduct: (show: boolean) => void;
  deleteProduct: (id: number) => void;
  speak: (text: string) => void;
  setImagePreview: (img: string | null) => void;
  setEditingProduct: (product: any) => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products, theme, setShowAddCategory, setShowAddProduct,
  deleteProduct, speak, setImagePreview, setEditingProduct
}) => {
  const { t } = useLanguage();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold tracking-tight ${theme === 'futuristic' ? 'text-white' : 'text-stone-800'}`}>{t('products')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all active:scale-95 border ${theme === 'futuristic' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            <List size={18} /> {t('category')}
          </button>
          <button
            onClick={() => setShowAddProduct(true)}
            className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95 ${theme === 'futuristic' ? 'bg-cyan-500 text-white neon-glow' : 'gold-gradient text-white hover:shadow-gold/20'}`}
          >
            <Plus size={18} /> {t('addProduct')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <div key={product.id} className={`rounded-[2rem] overflow-hidden shadow-sm border relative group transition-all hover:shadow-xl hover:-translate-y-1 ${theme === 'futuristic' ? 'glass-morphism border-white/10' : 'bg-white border-stone-100'}`}>
            {product.discountPrice && (
              <div className="absolute top-4 left-4 bg-oriental-red text-white text-[9px] font-black px-3 py-1 rounded-full z-10 shadow-lg uppercase tracking-widest">
                {t('discount')}
              </div>
            )}

            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
              <button
                onClick={() => {
                  deleteProduct(product.id);
                  speak(`Товар ${product.name} удален`);
                }}
                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="h-48 overflow-hidden">
              <img src={product.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-stone-800 text-lg tracking-tight truncate flex-1">{product.name}</h4>
              </div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{product.categoryName}</p>
                <StarRating rating={product.rating || 0} count={product.ratingCount || 0} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  {product.discountPrice ? (
                    <>
                      <span className="text-stone-300 text-[10px] font-bold line-through uppercase">{(product.price || 0).toLocaleString()}</span>
                      <span className="text-oriental-red font-black text-lg">{(product.discountPrice || 0).toLocaleString()} <span className="text-[10px]">UZS</span></span>
                    </>
                  ) : (
                    <span className="text-gold-dark font-black text-lg">{(product.price || 0).toLocaleString()} <span className="text-[10px]">UZS</span></span>
                  )}
                  <span className="text-stone-400 text-[10px] font-bold mt-1">Себестоимость: {(product.costPrice || 0).toLocaleString()} UZS</span>
                </div>

                <button
                  onClick={() => {
                    setImagePreview(product.image);
                    setEditingProduct(product);
                  }}
                  className="p-2 bg-stone-50 text-stone-400 rounded-xl hover:bg-gold/10 hover:text-gold transition-all"
                >
                  <Edit size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
