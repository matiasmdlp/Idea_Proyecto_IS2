## Para iniciar

Primero debes cloanr el repositorio, luego asegurate de instalar npm en la carpeta del repositorio

```bash 
npm install
```

Para luego agregar un .env en la carpeta raiz, con los siguientes parametros:

```bash
DATABASE_URL= API key
NEXTAUTH_URL=http://localhost:3000 # <- URL de desarrollo de tu app
NEXTAUTH_SECRET= Clave generada
WEATHERAPI_API_KEY= API key WeatherAPI
```

Instalar prisma y generar:

```bash
npm install prisma
npx prisma generate
```

una vez completados los pasos anteriores, solo debes iniciar el servidaor con

```bash
npm run dev
```
Ir a http://localhost:3000  en tu navegador.

## Listo

