import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sidebar } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/utils/axiosInstance";

type Campaign = { id: string; title: string };
type Pledge = {
  id: string;
  name: string;
  phone: string;
  monetaryAmount: string;
  createdAt: string;
  campaign?: Campaign;
};

const money = (value: string) =>
  Number(value).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

export default function PledgesPage() {
  const [searchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({
    name: "",
    phone: "",
    campaignId: searchParams.get("campaignId") || "",
    amount: "",
    from: "",
    to: "",
  });

  const load = async (nextPage = page) => {
    const params = Object.fromEntries(
      Object.entries({ ...filters, page: nextPage, limit: 25 }).filter(
        ([, value]) => value !== "",
      ),
    );
    const response = await api.get<{ pledges: Pledge[]; pages: number }>(
      "/campaigns/pledges",
      { params },
    );
    setPledges(response.data.pledges);
    setPages(response.data.pages);
    setPage(nextPage);
  };

  useEffect(() => {
    Promise.all([api.get<{ campaigns: Campaign[] }>("/campaigns"), load(1)])
      .then(([campaignResponse]) =>
        setCampaigns(campaignResponse.data.campaigns),
      )
      .catch(() => toast.error("Unable to load pledge records"));
  }, []);

  const update = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="container mx-auto space-y-6 p-5 py-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Sidebar className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Pledge Records</h1>
          <p className="text-sm text-muted-foreground">
            Accountable pledge history across church campaigns.
          </p>
        </div>
      </div>
      <form
        className="grid gap-3 rounded-lg border bg-card p-5 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          void load(1);
        }}
      >
        <Input
          placeholder="Search name"
          value={filters.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <Input
          placeholder="Search phone"
          value={filters.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        <select
          className="rounded-md border bg-background px-3 text-sm"
          value={filters.campaignId}
          onChange={(e) => update("campaignId", e.target.value)}
        >
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </select>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Exact amount"
          value={filters.amount}
          onChange={(e) => update("amount", e.target.value)}
        />
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => update("from", e.target.value)}
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => update("to", e.target.value)}
        />
        <Button type="submit" className="gap-2 md:col-span-3 md:w-fit">
          <Search className="h-4 w-4" />
          Search pledges
        </Button>
      </form>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Campaign</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {pledges.map((pledge) => (
              <tr className="border-b last:border-0" key={pledge.id}>
                <td className="p-3 font-medium">{pledge.name}</td>
                <td className="p-3">{pledge.phone}</td>
                <td className="p-3">{pledge.campaign?.title || "-"}</td>
                <td className="p-3">{money(pledge.monetaryAmount ?? 0)}</td>
                <td className="p-3">
                  {new Date(pledge.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!pledges.length && (
          <p className="p-8 text-center text-muted-foreground">
            No pledges match these filters.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => void load(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
