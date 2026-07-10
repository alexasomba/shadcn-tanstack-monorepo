import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

const developers = [
  {
    id: "1",
    name: "Guillermo Rauch",
    username: "@rauchg",
    src: "https://github.com/rauchg.png",
    fallback: "GR",
    country: "USA",
    contributions: 1240,
    status: "online",
  },
  {
    id: "2",
    name: "Evan You",
    username: "@yyx990803",
    src: "https://github.com/yyx990803.png",
    fallback: "EY",
    country: "Singapore",
    contributions: 980,
    status: "online",
  },
  {
    id: "3",
    name: "Dan Abramov",
    username: "@gaearon",
    src: "https://github.com/gaearon.png",
    fallback: "DA",
    country: "UK",
    contributions: 870,
    status: "away",
  },
  {
    id: "4",
    name: "Addy Osmani",
    username: "@addyosmani",
    src: "https://github.com/addyosmani.png",
    fallback: "AO",
    country: "USA",
    contributions: 650,
    status: "offline",
  },
];

const getStatusDot = (status: string) => {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "away":
      return "bg-yellow-500";
    case "offline":
      return "bg-muted-foreground";
    default:
      return "";
  }
};

const Table15 = () => {
  return (
    <div className="w-full">
      <div className="[&>div]:rounded-sm [&>div]:border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>#</TableHead>
              <TableHead>Developer</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Commits</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {developers.map((dev, i) => (
              <TableRow key={dev.id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={dev.src} alt={dev.name} />
                        <AvatarFallback className="text-xs">{dev.fallback}</AvatarFallback>
                      </Avatar>

                      <span
                        className={`absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border border-background ${getStatusDot(
                          dev.status,
                        )}`}
                      />
                    </div>

                    <div>
                      <div className="leading-none font-medium">{dev.name}</div>
                      <div className="text-xs text-muted-foreground">{dev.username}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground">{dev.country}</TableCell>

                <TableCell className="text-right">
                  <div className="font-semibold">{dev.contributions.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">contributions</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">Developer leaderboard</p>
    </div>
  );
};

export default Table15;
