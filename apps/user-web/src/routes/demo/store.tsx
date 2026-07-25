import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";

import { fullName, store } from "#/lib/demo-store";

export const Route = createFileRoute("/demo/store")({
  component: DemoStore,
});

function FirstName() {
  const firstName = useStore(store, (state) => state.firstName);
  return (
    <div>
      <label htmlFor="first-name" className="mb-1 block text-xs font-medium text-[var(--sea-ink)]">
        First Name
      </label>
      <input
        id="first-name"
        name="firstName"
        type="text"
        autoComplete="given-name"
        aria-label="First Name"
        value={firstName}
        onChange={(e) => store.setState((state) => ({ ...state, firstName: e.target.value }))}
        className="demo-input"
      />
    </div>
  );
}

function LastName() {
  const lastName = useStore(store, (state) => state.lastName);
  return (
    <div>
      <label htmlFor="last-name" className="mb-1 block text-xs font-medium text-[var(--sea-ink)]">
        Last Name
      </label>
      <input
        id="last-name"
        name="lastName"
        type="text"
        autoComplete="family-name"
        aria-label="Last Name"
        value={lastName}
        onChange={(e) => store.setState((state) => ({ ...state, lastName: e.target.value }))}
        className="demo-input"
      />
    </div>
  );
}

function FullName() {
  const fName = useStore(fullName, (state) => state);
  return <div className="demo-list-item font-medium">{fName}</div>;
}

function DemoStore() {
  return (
    <main className="demo-page demo-center">
      <section className="demo-panel flex w-full max-w-xl flex-col gap-4">
        <p className="island-kicker">TanStack Store</p>
        <h1 className="demo-title mb-2">Store Example</h1>
        <FirstName />
        <LastName />
        <FullName />
      </section>
    </main>
  );
}
