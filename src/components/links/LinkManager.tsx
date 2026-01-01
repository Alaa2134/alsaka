import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Link, 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff, 
  ShoppingCart, 
  Package, 
  FileText, 
  CreditCard, 
  Tag,
  ExternalLink,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStoreLinks, StoreLinkType, StoreLink } from "@/hooks/useStoreLinks";
import { useToast } from "@/hooks/use-toast";
import { CreateLinkDialog } from "./CreateLinkDialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface LinkManagerProps {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  allowedTypes?: StoreLinkType[];
}

const linkTypeIcons: Record<StoreLinkType, React.ReactNode> = {
  product: <Package className="h-4 w-4" />,
  cart: <ShoppingCart className="h-4 w-4" />,
  invoice: <FileText className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  offer: <Tag className="h-4 w-4" />,
};

const linkTypeLabels: Record<StoreLinkType, string> = {
  product: "منتج",
  cart: "سلة",
  invoice: "فاتورة",
  payment: "دفع",
  offer: "عرض",
};

const linkTypeColors: Record<StoreLinkType, string> = {
  product: "bg-blue-500",
  cart: "bg-green-500",
  invoice: "bg-purple-500",
  payment: "bg-orange-500",
  offer: "bg-pink-500",
};

export const LinkManager = ({ tenantId, tenantSlug, userId, allowedTypes }: LinkManagerProps) => {
  const { links, isLoading, createLink, deleteLink, toggleLinkStatus } = useStoreLinks(tenantId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const getFullUrl = (link: StoreLink) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/store/${tenantSlug}/link/${link.link_code}`;
  };

  const copyLink = (link: StoreLink) => {
    navigator.clipboard.writeText(getFullUrl(link));
    toast({
      title: "تم النسخ",
      description: "تم نسخ الرابط بنجاح",
    });
  };

  const handleDelete = async (linkId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الرابط؟")) {
      await deleteLink(linkId);
    }
  };

  const isExpired = (link: StoreLink) => {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) < new Date();
  };

  const isMaxedOut = (link: StoreLink) => {
    if (!link.max_uses) return false;
    return link.current_uses >= link.max_uses;
  };

  const getLinkStatus = (link: StoreLink) => {
    if (!link.is_active) return { label: "معطل", color: "bg-gray-500" };
    if (isExpired(link)) return { label: "منتهي", color: "bg-red-500" };
    if (isMaxedOut(link)) return { label: "وصل الحد", color: "bg-yellow-500" };
    return { label: "نشط", color: "bg-green-500" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Link className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">إدارة الروابط</h2>
            <p className="text-sm text-muted-foreground">
              إنشاء وإدارة روابط المتجر الخاصة
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إنشاء رابط
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['product', 'cart', 'invoice', 'payment', 'offer'] as StoreLinkType[]).map((type) => {
          const count = links.filter(l => l.link_type === type).length;
          return (
            <Card key={type} className="bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${linkTypeColors[type]} text-white`}>
                  {linkTypeIcons[type]}
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{linkTypeLabels[type]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">جميع الروابط</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>لا توجد روابط بعد</p>
              <p className="text-sm">أنشئ أول رابط للبدء</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {links.map((link, index) => {
                  const status = getLinkStatus(link);
                  return (
                    <motion.div
                      key={link.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${linkTypeColors[link.link_type]} text-white`}>
                          {linkTypeIcons[link.link_type]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{link.title}</h4>
                            <Badge variant="outline" className={`${status.color} text-white border-0 text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{link.link_code}</p>
                          {link.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              ينتهي: {format(new Date(link.expires_at), 'dd MMM yyyy', { locale: ar })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Usage Stats */}
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <BarChart3 className="h-3 w-3" />
                            <span className="text-sm font-medium">
                              {link.current_uses}
                              {link.max_uses && `/${link.max_uses}`}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">استخدام</p>
                        </div>

                        {/* Discount Badge */}
                        {link.discount_value && link.discount_value > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {link.discount_type === 'percentage' ? `${link.discount_value}%` : `${link.discount_value}`} خصم
                          </Badge>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={link.is_active}
                            onCheckedChange={(checked) => toggleLinkStatus(link.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyLink(link)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(getFullUrl(link), '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(link.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateLinkDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => {
          await createLink(data, userId);
          setIsCreateOpen(false);
        }}
        tenantId={tenantId}
        allowedTypes={allowedTypes}
      />
    </div>
  );
};
