import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, Menu, User, LogIn, Sparkles, Heart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { Badge } from "@/components/ui/badge";
import { Cart3DDrawer } from "./3d/Cart3DDrawer";

interface StoreHeaderProps {
  storeName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  tenantSlug: string;
}

export const StoreHeader = ({ storeName, logoUrl, primaryColor, tenantSlug }: StoreHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/store/${tenantSlug}/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { label: "الرئيسية", href: `/store/${tenantSlug}` },
    { label: "المنتجات", href: `/store/${tenantSlug}/products` },
  ];

  return (
    <>
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={`/store/${tenantSlug}`} className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName} className="h-10 w-auto object-contain" />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: primaryColor || "#3b82f6" }}
                  >
                    {storeName.charAt(0)}
                  </div>
                )}
              </motion.div>
              <span className="font-bold text-lg hidden sm:block">{storeName}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="relative text-muted-foreground hover:text-foreground transition-colors font-medium group"
                >
                  {link.label}
                  <motion.span
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </Link>
              ))}
            </nav>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="pr-10 bg-muted/50 border-0 focus-visible:ring-2"
                  style={{ ["--tw-ring-color" as any]: primaryColor }}
                />
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Wishlist Button - Only show if logged in */}
              {customer && (
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/store/${tenantSlug}/wishlist`)}
                    title="المفضلة"
                  >
                    <Heart className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              {/* Orders Button - Only show if logged in */}
              {customer && (
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/store/${tenantSlug}/orders`)}
                    title="طلباتي"
                  >
                    <Package className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              {/* Customer Account Button */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate(`/store/${tenantSlug}/account`)}
                  title={customer ? customer.name : "تسجيل الدخول"}
                >
                  {customer ? (
                    <User className="h-5 w-5 text-primary" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                </Button>
              </motion.div>

              {/* Cart Button */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setCartOpen(true)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1"
                      >
                        <Badge 
                          className="h-5 w-5 flex items-center justify-center p-0 text-xs border-2 border-background"
                          style={{ backgroundColor: primaryColor || "#3b82f6" }}
                        >
                          {totalItems}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col gap-6 mt-6">
                    {/* Mobile Search */}
                    <form onSubmit={handleSearch}>
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="ابحث عن منتج..."
                          className="pr-10"
                        />
                      </div>
                    </form>

                    {/* Mobile Navigation */}
                    <nav className="flex flex-col gap-4">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                          {link.label}
                        </Link>
                      ))}
                      
                      {/* Mobile Account Link */}
                      <Link
                        to={`/store/${tenantSlug}/account`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-2"
                      >
                        {customer ? (
                          <>
                            <User className="h-4 w-4" style={{ color: primaryColor }} />
                            حسابي ({customer.name})
                          </>
                        ) : (
                          <>
                            <LogIn className="h-4 w-4" style={{ color: primaryColor }} />
                            تسجيل الدخول
                          </>
                        )}
                      </Link>
                      
                      {/* Mobile Wishlist and Orders Links */}
                      {customer && (
                        <>
                          <Link
                            to={`/store/${tenantSlug}/wishlist`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-2"
                          >
                            <Heart className="h-4 w-4" style={{ color: primaryColor }} />
                            المفضلة
                          </Link>
                          <Link
                            to={`/store/${tenantSlug}/orders`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-lg font-medium hover:text-primary transition-colors flex items-center gap-2"
                          >
                            <Package className="h-4 w-4" style={{ color: primaryColor }} />
                            طلباتي
                          </Link>
                        </>
                      )}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </motion.header>

      {/* 3D Cart Drawer */}
      <Cart3DDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        tenantSlug={tenantSlug}
        primaryColor={primaryColor}
      />
    </>
  );
};
