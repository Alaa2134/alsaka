import { Facebook, Instagram, Music, Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store-context";

export function Footer() {
  const { feed } = useStore();
  if (!feed) return null;
  const { settings } = feed;

  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="container mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="font-bold text-lg mb-2">{settings.name}</div>
          {settings.description && <p className="text-muted-foreground">{settings.description}</p>}
        </div>

        <div>
          <h3 className="font-semibold mb-3">روابط</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to={`/${settings.slug}`} className="hover:text-primary">الرئيسية</Link></li>
            <li><Link to={`/${settings.slug}/products`} className="hover:text-primary">المنتجات</Link></li>
            <li><Link to={`/${settings.slug}/track`} className="hover:text-primary">تتبع طلب</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-3">تواصل</h3>
          <ul className="space-y-2 text-muted-foreground">
            {settings.phone && (
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /><span dir="ltr">{settings.phone}</span></li>
            )}
            {settings.email && (
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" />{settings.email}</li>
            )}
            {settings.address && (
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />{settings.address}</li>
            )}
          </ul>
          <div className="flex gap-2 mt-4">
            {settings.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted">
                <Facebook className="h-4 w-4" />
              </a>
            )}
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {settings.tiktok_url && (
              <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted">
                <Music className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">معلومات</h3>
          <ul className="space-y-2 text-muted-foreground">
            {settings.working_hours && <li>{settings.working_hours}</li>}
            {settings.delivery_note && <li>{settings.delivery_note}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {settings.name} · مدعوم من Horus System
      </div>
    </footer>
  );
}
