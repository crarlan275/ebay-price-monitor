# 🛍️ eBay Price Monitor

Monitor automático de precios en eBay con alertas instantáneas por WhatsApp.

## Estado actual

✅ **Arquitectura completa** — Código funcional generado
✅ **Firebase** — Pendiente de configuración (ver Paso 3 abajo)
✅ **Vercel** — Pendiente de deploy (ver Paso 4 abajo)
🎨 **Diseño** — Pendiente de indicaciones estéticas del usuario

---

## Stack tecnológico

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — diseño pendiente de personalización
- **Firebase Firestore** — base de datos
- **Firebase Auth** — autenticación
- **eBay Browse API** — búsqueda de productos
- **Callmebot API** — alertas por WhatsApp
- **Vercel Cron Jobs** — monitoreo cada 30 minutos
- **next-pwa** — Progressive Web App instalable

---

## Variables de entorno que debes completar manualmente

### ⚠️ Requieren registro externo (no se configuran automáticamente)

```env
# eBay Developer Account → https://developer.ebay.com
EBAY_CLIENT_ID=tu_ebay_client_id
EBAY_CLIENT_SECRET=tu_ebay_client_secret

# Callmebot → https://www.callmebot.com/blog/free-api-whatsapp-messages/
CALLMEBOT_PHONE=+1234567890
CALLMEBOT_APIKEY=tu_callmebot_apikey
```

### ✅ Se configuran automáticamente desde Firebase

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

### ✅ Se genera automáticamente

```env
CRON_SECRET=uuid_generado_automaticamente
```

---

## Estructura del proyecto

```
ebay-price-monitor/
├── app/
│   ├── api/
│   │   ├── ebay/route.ts        # Búsqueda manual en tiempo real
│   │   ├── alerts/route.ts      # Historial de alertas enviadas
│   │   ├── products/route.ts    # CRUD de productos + settings
│   │   └── cron/route.ts        # Job de monitoreo (Vercel Cron)
│   ├── dashboard/page.tsx       # Resumen y métricas
│   ├── products/page.tsx        # Gestión de productos
│   ├── history/page.tsx         # Historial + gráfica de precios
│   ├── settings/page.tsx        # Configuración del usuario
│   └── layout.tsx
├── components/
│   ├── ProductCard.tsx          # Tarjeta de producto
│   ├── PriceChart.tsx           # Gráfica Recharts
│   ├── AlertBadge.tsx           # Badge de oferta detectada
│   └── Navbar.tsx               # Navegación principal
├── lib/
│   ├── ebay.ts                  # OAuth + Browse API
│   ├── whatsapp.ts              # Callmebot integration
│   ├── firebase.ts              # Firestore CRUD
│   └── utils.ts                 # Helpers
├── public/
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # Íconos PWA (reemplazar con PNGs)
├── vercel.json                  # Cron: cada 30 min
└── .env.example                 # Template de variables
```

---

## Colecciones de Firestore

| Colección      | Descripción                          |
|----------------|--------------------------------------|
| `products`     | Productos y keywords a monitorear   |
| `priceHistory` | Cada oferta encontrada por el cron  |
| `alerts`       | Registro de alertas enviadas        |
| `settings`     | Configuración por usuario           |

---

## Cómo agregar el diseño

Todos los componentes tienen comentarios `PENDIENTE DISEÑO:` indicando exactamente qué clases de Tailwind o variables de color personalizar. Busca esos comentarios en:

- `app/layout.tsx` — tipografía y fondo base
- `tailwind.config.ts` — paleta de colores y fuentes
- `components/Navbar.tsx` — barra de navegación
- `components/ProductCard.tsx` — tarjetas
- `app/globals.css` — variables CSS globales

---

## Instrucciones de deploy

### 1. Clonar y configurar

```bash
git clone https://github.com/TU_USUARIO/ebay-price-monitor
cd ebay-price-monitor
npm install
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

### 2. Desarrollo local

```bash
npm run dev
```

### 3. Deploy en Vercel

Conectar el repositorio en vercel.com → el deploy es automático.

---

## Licencia

MIT
