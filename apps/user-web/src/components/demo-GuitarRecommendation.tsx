import { useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";

import guitars from "#/data/demo-guitars";
import { showAIAssistant } from "#/lib/stores";

export default function GuitarRecommendation({ id }: { id: string }) {
  const navigate = useNavigate();
  const guitar = guitars.find((guitar) => guitar.id === +id);
  if (!guitar) {
    return null;
  }
  return (
    <Card className="my-4 overflow-hidden border-border/70 shadow-none">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={guitar.image} alt={guitar.name} className="size-full object-cover" />
      </div>
      <CardContent className="p-4">
        <h3 className="mb-2 text-lg font-semibold text-foreground">{guitar.name}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{guitar.shortDescription}</p>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-foreground">${guitar.price}</div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void navigate({
                to: "/demo/guitars/$guitarId",
                params: { guitarId: guitar.id.toString() },
              });
              showAIAssistant.setState(() => false);
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

