import LoginForm from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextRaw = resolvedSearchParams?.next;
  const nextValue = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;
  const nextPath = nextValue && nextValue.startsWith('/') ? nextValue : '/';

  return <LoginForm nextPath={nextPath} />;
}
