import { ChefHat, Clock, Gauge, Users } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";
import { Streamdown } from "streamdown";

import type { Recipe } from "./api.ai.structured";

type Mode = "structured" | "oneshot";

const SAMPLE_RECIPES = [
  "Homemade Margherita Pizza",
  "Thai Green Curry",
  "Classic Beef Bourguignon",
  "Chocolate Lava Cake",
  "Crispy Korean Fried Chicken",
  "Fresh Spring Rolls with Peanut Sauce",
  "Creamy Mushroom Risotto",
  "Authentic Pad Thai",
];

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h3 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">{recipe.name}</h3>
        <p className="demo-muted">{recipe.description}</p>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4">
        <div className="demo-muted flex items-center gap-2">
          <Clock className="text-[var(--lagoon-deep)] size-4" />
          <span className="text-sm">Prep: {recipe.prepTime}</span>
        </div>
        <div className="demo-muted flex items-center gap-2">
          <Clock className="text-[var(--lagoon-deep)] size-4" />
          <span className="text-sm">Cook: {recipe.cookTime}</span>
        </div>
        <div className="demo-muted flex items-center gap-2">
          <Users className="text-[var(--lagoon-deep)] size-4" />
          <span className="text-sm">{recipe.servings} servings</span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="size-4" />
          <Badge variant="outline" className="text-sm capitalize">{recipe.difficulty}</Badge>
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <h4 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">Ingredients</h4>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {recipe.ingredients.map((ing) => (
            <li key={`${ing.item}-${ing.amount}`} className="demo-muted flex items-start gap-2">
              <span className="text-[var(--lagoon-deep)]">•</span>
              <span>
                <span className="font-medium">{ing.amount}</span> {ing.item}
                {ing.notes && <span className="text-sm"> ({ing.notes})</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Instructions */}
      <div>
        <h4 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">Instructions</h4>
        <ol className="flex flex-col gap-3">
          {recipe.instructions.map((step, idx) => (
            <li key={step} className="demo-muted flex gap-3">
              <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--chip-bg)] text-sm font-medium text-[var(--sea-ink)]">
                {idx + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <div>
          <h4 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">Tips</h4>
          <ul className="flex flex-col gap-2">
            {recipe.tips.map((tip) => (
              <li key={tip} className="demo-muted flex items-start gap-2">
                <span className="text-[var(--lagoon-deep)]">*</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nutrition */}
      {recipe.nutritionPerServing && (
        <div>
          <h4 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
            Nutrition (per serving)
          </h4>
          <div className="flex flex-wrap gap-4 text-sm">
            {recipe.nutritionPerServing.calories && (
              <Badge variant="secondary">{recipe.nutritionPerServing.calories} cal</Badge>
            )}
            {recipe.nutritionPerServing.protein && (
              <Badge variant="secondary">Protein: {recipe.nutritionPerServing.protein}</Badge>
            )}
            {recipe.nutritionPerServing.carbs && (
              <Badge variant="secondary">Carbs: {recipe.nutritionPerServing.carbs}</Badge>
            )}
            {recipe.nutritionPerServing.fat && (
              <Badge variant="secondary">Fat: {recipe.nutritionPerServing.fat}</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StructuredPage() {
  const [recipeName, setRecipeName] = useState("");
  const [result, setResult] = useState<{
    mode: Mode;
    recipe?: Recipe;
    markdown?: string;
    provider: string;
    model: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (mode: Mode) => {
    if (!recipeName.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/demo/api/ai/structured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeName, mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate recipe");
      }

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const canExecute = !isLoading && Boolean(recipeName.trim()) && !error;

  return (
    <main className="demo-page demo-page-wide">
      <div>
        <div className="mb-6 flex items-center gap-3">
          <ChefHat className="text-[var(--lagoon-deep)] size-8" />
          <h1 className="demo-title">One-Shot & Structured Output</h1>
        </div>

        <p className="demo-muted mb-6">
          Compare two output modes: <strong className="text-[var(--sea-ink)]">One-Shot</strong>{" "}
          returns freeform markdown, while{" "}
          <strong className="text-[var(--sea-ink)]">Structured</strong> returns validated JSON
          conforming to a Zod schema.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="recipe-name">Recipe Name</FieldLabel>
              <Input
                id="recipe-name"
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                disabled={isLoading}
                placeholder="e.g., Chocolate Chip Cookies"
              />
            </Field>

            <div>
              <FieldLabel className="mb-2 block text-sm">Quick Picks</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_RECIPES.map((name) => (
                  <Button
                    key={name}
                    variant="outline"
                    size="sm"
                    onClick={() => setRecipeName(name)}
                    disabled={isLoading}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>
          </FieldGroup>

          <div className="flex items-end gap-2">
            <Button
              onClick={() => handleGenerate("oneshot")}
              disabled={!canExecute}
              className="flex-1"
            >
              One-Shot (Markdown)
            </Button>
            <Button
              onClick={() => handleGenerate("structured")}
              disabled={!canExecute}
              className="flex-1"
            >
              Structured (JSON)
            </Button>
          </div>
        </div>

        <div className="demo-panel mt-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="demo-section-title">Generated Recipe</h2>
            {result ? (
              <Badge variant="secondary">
                {result.mode === "structured" ? "Structured JSON" : "Markdown"}
              </Badge>
            ) : null}
          </div>

          {isLoading ? (
            <div role="status" aria-live="polite" className="sr-only">
              Generating recipe...
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <div className="flex flex-col gap-4">
              {result.mode === "structured" && result.recipe ? (
                <RecipeCard recipe={result.recipe} />
              ) : result.markdown ? (
                <div className="max-w-none">
                  <Streamdown>{result.markdown}</Streamdown>
                </div>
              ) : null}
            </div>
          ) : !error && !isLoading ? (
            <div className="demo-muted flex h-64 flex-col items-center justify-center">
              <ChefHat className="mb-4 size-16 opacity-50" />
              <p>Enter a recipe name and click "Generate Recipe" to get started.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/demo/ai-structured")({
  component: StructuredPage,
});

