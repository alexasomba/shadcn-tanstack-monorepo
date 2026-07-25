import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { fullName, store } from "#/lib/demo-store";

export const Route = createFileRoute("/demo/store")({
  component: DemoStore,
});

function FirstName() {
  const firstName = useStore(store, (state) => state.firstName);
  return (
    <Field>
      <FieldLabel htmlFor="first-name">First Name</FieldLabel>
      <Input
        id="first-name"
        name="firstName"
        type="text"
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => store.setState((state) => ({ ...state, firstName: e.target.value }))}
      />
    </Field>
  );
}

function LastName() {
  const lastName = useStore(store, (state) => state.lastName);
  return (
    <Field>
      <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
      <Input
        id="last-name"
        name="lastName"
        type="text"
        autoComplete="family-name"
        value={lastName}
        onChange={(e) => store.setState((state) => ({ ...state, lastName: e.target.value }))}
      />
    </Field>
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
        <FieldGroup>
          <FirstName />
          <LastName />
        </FieldGroup>
        <FullName />
      </section>
    </main>
  );
}

