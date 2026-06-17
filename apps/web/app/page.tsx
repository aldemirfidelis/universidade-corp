import { redirect } from 'next/navigation';

// O middleware já redireciona "/" conforme autenticação; este é um fallback.
export default function RootPage() {
  redirect('/login');
}
