import { Component, type ReactNode } from 'react';

// React still only catches render errors in a class component, so this is
// the one class in the app. Without it, any render error leaves a blank page.
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className='screen'>
          <div role='alert'>
            <h1 className='title'>Something went wrong</h1>
            <p>Reload the page to start again.</p>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
