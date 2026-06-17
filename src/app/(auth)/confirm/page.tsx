export default function ConfirmEmailPage() {
  return (
    <div className="flex flex-col gap-3 text-center">
      <h1 className="text-lg font-semibold">Check your email</h1>
      <p className="text-sm text-muted-foreground">
        We sent a confirmation link to the email address you signed up with.
        Click it to activate your account, then come back and log in.
      </p>
    </div>
  );
}
