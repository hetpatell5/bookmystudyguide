import React from 'react';
import { useCart } from '../../../../context/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, ShieldCheck, RotateCcw, ChevronLeft, Tag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import "./cart.scss";
import { getOptimizedImageUrl } from '../../../../utils/imageUtils';

const CartItemCard = React.memo(({ item, index, updateQuantity, removeFromCart }) => {
  const image = getOptimizedImageUrl(item.image || (item.images?.[0]) || "/noimg.png");
  const isHard = !(item.type?.toLowerCase().includes('soft'));
  const lineTotal = (item.price * item.quantity).toLocaleString('en-IN');

  return (
    <div className="ci-row" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="ci-img">
        <img src={image} alt={item.name} loading="lazy" />
      </div>

      <div className="ci-body">
        <div className="ci-top">
          <div className="ci-meta">
            <span className={`ci-badge ${isHard ? 'ci-badge--hard' : 'ci-badge--soft'}`}>
              {isHard ? 'Hard Copy' : 'Soft Copy'}
            </span>
            {item.sku && item.sku !== 'NO-SKU' && (
              <span className="ci-sku">SKU: {item.sku}</span>
            )}
          </div>
          <button
            className="ci-remove"
            onClick={() => removeFromCart(item.productId, item.type)}
            title="Remove"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <h3 className="ci-name">{item.name}</h3>

        <div className="ci-bottom">
          <div className="ci-qty">
            <button
              onClick={() => updateQuantity(item.productId, item.type, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus size={14} />
            </button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.productId, item.type, item.quantity + 1)}>
              <Plus size={14} />
            </button>
          </div>

          <div className="ci-price">
            <span className="ci-total">₹{lineTotal}</span>
            {item.quantity > 1 && (
              <span className="ci-unit">₹{Number(item.price).toLocaleString('en-IN')} each</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart, loading } = useCart();
  const navigate = useNavigate();

  if (loading) return null;

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <div className="cart-empty-icon"><ShoppingBag size={44} /></div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything yet. Let's fix that!</p>
          <Link to="/" className="cart-empty-btn">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-inner">

        {/* Header */}
        <div className="cart-head">
          <div className="cart-head-left">
            <h1>Shopping Cart</h1>
            <span className="cart-count">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
          </div>
          <Link to="/" className="cart-back">
            <ChevronLeft size={16} /> Continue Shopping
          </Link>
        </div>

        <div className="cart-layout">

          {/* LEFT — Items */}
          <div className="cart-left">
            <div className="cart-items">
              {cartItems.map((item, i) => (
                <CartItemCard
                  key={`${item.productId}-${item.type}`}
                  item={item}
                  index={i}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                />
              ))}
            </div>

            <div className="cart-foot">
              <button className="cart-clear" onClick={clearCart}>
                <Trash2 size={14} /> Clear cart
              </button>
            </div>
          </div>

          {/* RIGHT — Summary */}
          <aside className="cart-summary">

            <div className="cart-summary-header">
              <span>Order Summary</span>
            </div>

            <div className="cart-summary-rows">
              <div className="cart-sum-row">
                <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="cart-sum-row cart-ship-note">
                <span>Shipping</span>
                <span className="cart-ship-calc">Calculated at checkout</span>
              </div>
              <div className="cart-sum-row cart-sum-row--total">
                <span>Total</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button className="cart-checkout-btn" onClick={() => navigate('/checkout')}>
              Proceed to Checkout <ArrowRight size={18} />
            </button>

            <div className="cart-trust">
              <div className="cart-trust-item">
                <ShieldCheck size={18} />
                <span>Secure Payment</span>
              </div>
              <div className="cart-trust-item">
                <Truck size={18} />
                <span>Fast Delivery</span>
              </div>
              <div className="cart-trust-item">
                <RotateCcw size={18} />
                <span>Easy Returns</span>
              </div>
            </div>

            <div className="cart-accept">
              <Tag size={12} /> We accept Razorpay · UPI · Cards · NetBanking
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
