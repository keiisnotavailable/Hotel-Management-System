import AuthModal from '../components/AuthModal'

export default function SignInPage() {
  return <AuthModal initialMode="signin" onClose={() => { window.history.back() }} />
}
