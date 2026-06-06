import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Users,
  Search,
  Plus,
  Download,
  MapPin,
  Calendar,
  Activity,
  Clock,
  FileText,
  Eye,
  ChevronDown,
  Pill,
  ClipboardList,
  Archive,
  HeartPulse,
  Scale,
  Droplets,
  NotebookPen,
  AlertTriangle,
  Building2,
  Filter,
  RotateCcw,
  UserCheck,
  UserX,
  Plane,
  Hospital,
  MoreHorizontal,
  Shield,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AddIndividualDialog } from "@/components/individuals/AddIndividualDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const Route = createFileRoute("/individuals/")({
  head: () => ({
    meta: [
      { title: "Individuals — iCareManager" },
      {
        name: "description",
        content: "Browse and manage individuals enrolled in services.",
      },
    ],
  }),
  component: IndividualsListPage,
});

const profileMenuItems = [
  { label: "Medication", icon: Pill, category: "medical" },
  { label: "e-MAR", icon: ClipboardList, category: "medical" },
  { label: "Services", icon: FileText, category: "services" },
  { label: "Archived Plan", icon: Archive, category: "services" },
  { label: "Vital Signs/BP", icon: HeartPulse, category: "health" },
  { label: "Weight Record", icon: Scale, category: "health" },
  { label: "Blood Sugar Log", icon: Droplets, category: "health" },
  { label: "Bowel Movement", icon: NotebookPen, category: "health" },
  { label: "Care Notes", icon: NotebookPen, category: "notes" },
  { label: "Incident Report", icon: AlertTriangle, category: "incident" },
  { label: "Incident Reporting Center", icon: Building2, category: "incident" },
];

type StatusKey = "Active" | "AWOL" | "Jail" | "Vacation" | "Hospitalized";

const statusConfig: Record<
  StatusKey,
  { bg: string; text: string }
> = {
  Active: { bg: "bg-success/10", text: "text-success" },
  AWOL: { bg: "bg-tertiary/10", text: "text-tertiary" },
  Jail: { bg: "bg-primary/10", text: "text-primary" },
  Vacation: { bg: "bg-secondary", text: "text-secondary-foreground" },
  Hospitalized: { bg: "bg-destructive/10", text: "text-destructive" },
};

type MockIndividual = {
  id: string;
  name: string;
  gender?: string;
  age?: number;
  dob?: string;
  admittedOn: string;
  pcpDate?: string;
  dhspDate?: string;
  medicalNumber?: string;
  location: string;
  status: StatusKey;
  updatedOn: string;
  updatedBy: string;
  avatar?: string;
  tags: string[];
};

const mockIndividuals: MockIndividual[] = [
  { id: "esha", name: "16, Esha", gender: "M", age: 0, dob: "12/16/2025", admittedOn: "12/16/2025", location: "Cecil Street", status: "Active", updatedOn: "12/18/2023", updatedBy: "Esha Shehzad", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", tags: [] },
  { id: "esha2", name: "6-Nov, Esha", gender: "TS", age: 0, dob: "11/02/2025", admittedOn: "10/28/2025", pcpDate: "11/12", location: "Annie's Site", status: "Jail", updatedOn: "12/16/2025", updatedBy: "Esha Shehzad", tags: [] },
  { id: "aaaa", name: "Aaaa, Bbbb", gender: "M", age: 26, dob: "01/01/2000", admittedOn: "02/06/2025", pcpDate: "01/29", location: "Cecil Street", status: "Active", updatedOn: "09/05/2025", updatedBy: "Esha Shehzad", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", tags: ["No Consent To Photograph"] },
  { id: "lilla", name: "Abshire, Lilla", gender: "M", age: 0, dob: "01/05/2026", admittedOn: "01/07/2026", location: "Easy Street", status: "Active", updatedOn: "01/05/2026", updatedBy: "Abdul Saboor", tags: [] },
  { id: "lead", name: "Ahmad, Lead", gender: "M", age: 26, dob: "01/01/2000", admittedOn: "11/28/2024", pcpDate: "12/12", location: "Site", status: "AWOL", updatedOn: "10/14/2025", updatedBy: "Babar Nawaz", tags: ["ORI", "OLST", "Consent To Photograph"] },
  { id: "manahil1", name: "Ahmad, Manahil", gender: "F", age: 25, dob: "02/25/2000", admittedOn: "10/14/2025", pcpDate: "10/30", location: "Cecil Street", status: "Vacation", updatedOn: "11/03/2025", updatedBy: "Babar Nawaz", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", tags: [] },
  { id: "manahil2", name: "Ali Ahmad, Manahil", gender: "F", age: 0, dob: "09/03/2025", admittedOn: "09/09/2025", location: "Cecil Street", status: "Vacation", updatedOn: "11/10/2025", updatedBy: "Babar Nawaz", tags: [] },
  { id: "medicare", name: "Ali Khan, Medicare", admittedOn: "09/29/2025", location: "ABC Pet Shop", status: "Active", updatedOn: "09/23/2025", updatedBy: "Babar Nawaz", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", tags: [] },
  { id: "adam", name: "Alisha, Adam", gender: "F", age: 0, dob: "09/17/2025", medicalNumber: "123583522Ma", admittedOn: "07/29/2025", pcpDate: "08/07", location: "Spring Fields", status: "AWOL", updatedOn: "12/10/2025", updatedBy: "Esha Shehzad", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", tags: ["MOLST"] },
  { id: "mickey1", name: "Angel, Mickey", admittedOn: "08/12/2025", pcpDate: "08/19", location: "Easy Street", status: "Active", updatedOn: "07/29/2025", updatedBy: "Babar Nawaz", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face", tags: [] },
  { id: "aq1", name: "Aqbar, Muhammad", gender: "M", age: 0, dob: "09/16/2025", admittedOn: "09/01/2025", location: "Easy Street", status: "Active", updatedOn: "09/22/2025", updatedBy: "Babar Nawaz", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face", tags: [] },
  { id: "aq2", name: "Aqbar, Muhammad", gender: "M", age: 0, dob: "09/09/2025", admittedOn: "09/03/2025", location: "Cecil Street", status: "Active", updatedOn: "09/22/2025", updatedBy: "Babar Nawaz", tags: [] },
  { id: "aq3", name: "Aqbar, Muhammad", gender: "M", age: 0, dob: "02/28/2025", admittedOn: "09/08/2025", location: "Cecil Street", status: "Active", updatedOn: "09/22/2025", updatedBy: "Babar Nawaz", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", tags: [] },
  { id: "raja", name: "Aqbar, Raja", gender: "M", age: 0, dob: "09/09/2025", admittedOn: "09/03/2025", location: "Woodland", status: "Hospitalized", updatedOn: "11/04/2025", updatedBy: "Babar Nawaz", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face", tags: [] },
  { id: "betsy", name: "Arthur, Betsy", gender: "F", age: 26, dob: "01/01/2000", admittedOn: "06/02/2020", pcpDate: "10/28", location: "Test site", status: "Active", updatedOn: "01/01/2026", updatedBy: "DDA Demo", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face", tags: ["Covid Positive", "Consent To Photograph"] },
  { id: "mickey2", name: "Arthur, Mickey", gender: "M", age: 26, dob: "01/01/2000", admittedOn: "04/01/2022", pcpDate: "12/15", dhspDate: "05/13", location: "ABC Pet Shop", status: "Active", updatedOn: "08/14/2025", updatedBy: "Faisal Ali Khan", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", tags: ["Consent To Photograph"] },
];

const statusTabs = [
  { key: "all", label: "All", icon: Users },
  { key: "Active", label: "Active", icon: UserCheck },
  { key: "AWOL", label: "AWOL", icon: UserX },
  { key: "Vacation", label: "Vacation", icon: Plane },
  { key: "Hospitalized", label: "Hospitalized", icon: Hospital },
  { key: "Jail", label: "Jail", icon: Shield },
];

function getStatusDot(status: StatusKey) {
  switch (status) {
    case "Active":
      return "bg-success";
    case "AWOL":
      return "bg-tertiary";
    case "Jail":
      return "bg-primary";
    case "Vacation":
      return "bg-secondary-foreground";
    case "Hospitalized":
      return "bg-destructive";
    default:
      return "bg-muted";
  }
}

function getInitials(name: string) {
  const parts = name.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return `${parts[1][0] || ""}${parts[0][0] || ""}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function IndividualsListPage() {
  const navigate = useNavigate();
  const [searchFirstName, setSearchFirstName] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [searchAlsoKnownAs, setSearchAlsoKnownAs] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityHandling, setPriorityHandling] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [covidPositive, setCovidPositive] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [locationFilter, setLocationFilter] = useState("all");

  const goToIndividual = (id: string) => {
    // Existing chart route only knows seeded ids; fall back to "esha" for design preview.
    const seeded = new Set(["esha", "marcus", "lena"]);
    navigate({
      to: "/individuals/$id",
      params: { id: seeded.has(id) ? id : "esha" },
    });
  };

  const filteredIndividuals = mockIndividuals.filter((ind) => {
    if (statusFilter !== "all" && ind.status !== statusFilter) return false;
    if (
      searchFirstName &&
      !ind.name.toLowerCase().includes(searchFirstName.toLowerCase())
    )
      return false;
    if (
      searchLastName &&
      !ind.name.toLowerCase().includes(searchLastName.toLowerCase())
    )
      return false;
    return true;
  });

  const statusCounts = {
    all: mockIndividuals.length,
    Active: mockIndividuals.filter((i) => i.status === "Active").length,
    AWOL: mockIndividuals.filter((i) => i.status === "AWOL").length,
    Vacation: mockIndividuals.filter((i) => i.status === "Vacation").length,
    Hospitalized: mockIndividuals.filter((i) => i.status === "Hospitalized")
      .length,
    Jail: mockIndividuals.filter((i) => i.status === "Jail").length,
  };

  const handleClearFilters = () => {
    setSearchFirstName("");
    setSearchLastName("");
    setSearchAlsoKnownAs("");
    setStatusFilter("all");
    setPriorityHandling(false);
    setCovidPositive(false);
    setLocationFilter("all");
  };

  return (
    <AppShell>
      <main className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Individuals Directory
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage individuals, services, and care programs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 shadow-sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Individual
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-tertiary border-tertiary/30 hover:bg-tertiary/10"
              >
                <Clock className="h-4 w-4 mr-1.5" />
                Pending
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-muted-foreground"
              >
                <UserX className="h-4 w-4 mr-1.5" />
                Discharged
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    Badges
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {mockIndividuals.length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-success/5 to-transparent border-success/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Active
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {statusCounts.Active}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-tertiary/5 to-transparent border-tertiary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      AWOL
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {statusCounts.AWOL}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-tertiary/10 flex items-center justify-center">
                    <UserX className="h-5 w-5 text-tertiary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-secondary to-transparent border-line">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Vacation
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {statusCounts.Vacation}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Plane className="h-5 w-5 text-secondary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-destructive/5 to-transparent border-destructive/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Hospitalized
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {statusCounts.Hospitalized}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Hospital className="h-5 w-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collapsible Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <Card className="rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Filters & Search</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      filtersOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-4 pt-4 border-t border-border/50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <Input
                      placeholder="First Name"
                      value={searchFirstName}
                      onChange={(e) => setSearchFirstName(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      placeholder="Last Name"
                      value={searchLastName}
                      onChange={(e) => setSearchLastName(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      placeholder="Also Known As"
                      value={searchAlsoKnownAs}
                      onChange={(e) => setSearchAlsoKnownAs(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Select
                      value={locationFilter}
                      onValueChange={setLocationFilter}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="cecil">Cecil Street</SelectItem>
                        <SelectItem value="easy">Easy Street</SelectItem>
                        <SelectItem value="woodland">Woodland</SelectItem>
                        <SelectItem value="spring">Spring Fields</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 mb-3 justify-between">
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Priority Handling in Emergency:
                        </span>
                        <Switch
                          checked={priorityHandling}
                          onCheckedChange={setPriorityHandling}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Covid Positive:
                        </span>
                        <Switch
                          checked={covidPositive}
                          onCheckedChange={setCovidPositive}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Search className="h-3.5 w-3.5 mr-1.5" />
                        Search
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={handleClearFilters}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Status Tabs & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-xl">
              {statusTabs.map((tab) => {
                const count =
                  statusCounts[tab.key as keyof typeof statusCounts] || 0;
                const active = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`ml-1.5 text-xs ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {filteredIndividuals.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {mockIndividuals.length}
              </span>{" "}
              records
            </p>
          </div>

          {/* Individuals List Cards */}
          <div className="grid gap-3">
            {filteredIndividuals.map((individual) => {
              const statusStyle = statusConfig[individual.status];
              return (
                <Card
                  key={individual.id}
                  className="group rounded-2xl hover:shadow-card-hover transition-all duration-200 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-wrap items-center gap-6 p-5">
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="relative">
                          <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
                            <AvatarImage
                              src={individual.avatar}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                              {getInitials(individual.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${getStatusDot(
                              individual.status,
                            )}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {individual.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border-0 px-2 py-0.5`}
                          >
                            {individual.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Gender / Age */}
                      <div className="hidden sm:flex flex-col min-w-[80px]">
                        <span className="text-xs text-muted-foreground">
                          Gender / Age
                        </span>
                        <span className="text-sm font-medium text-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {individual.gender
                            ? `${individual.gender} / ${individual.age || 0}`
                            : "—"}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="hidden md:flex flex-col min-w-[120px]">
                        <span className="text-xs text-muted-foreground">
                          Location
                        </span>
                        <span className="text-sm font-medium text-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {individual.location}
                        </span>
                      </div>

                      {/* Admitted On */}
                      <div className="hidden lg:flex flex-col min-w-[100px]">
                        <span className="text-xs text-muted-foreground">
                          Admitted
                        </span>
                        <span className="text-sm font-medium text-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {individual.admittedOn}
                        </span>
                      </div>

                      {/* PCP Date */}
                      <div className="hidden lg:flex flex-col min-w-[90px]">
                        <span className="text-xs text-muted-foreground">
                          PCP
                        </span>
                        {individual.pcpDate ? (
                          <span className="text-sm font-medium text-success flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {individual.pcpDate}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="hidden xl:flex flex-1 flex-wrap gap-1.5 min-w-[150px]">
                        {individual.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              tag.includes("Covid") ||
                              tag.includes("No Consent")
                                ? "bg-destructive/10 text-destructive"
                                : tag.includes("Consent")
                                ? "bg-success/10 text-success"
                                : "bg-tertiary/10 text-tertiary"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {individual.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{individual.tags.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Updated */}
                      <div className="hidden md:flex flex-col min-w-[140px]">
                        <span className="text-xs text-muted-foreground">
                          Updated By / On
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {individual.updatedOn}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {individual.updatedBy}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs hover:bg-secondary hover:text-secondary-foreground gap-1.5"
                          onClick={() => goToIndividual(individual.id)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          e-Chart
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs hover:bg-muted gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Facesheet
                        </Button>

                        {/* Split button: Profile + Dropdown */}
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs hover:bg-primary hover:text-primary-foreground gap-1.5 rounded-r-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToIndividual(individual.id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Profile
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-1.5 hover:bg-primary hover:text-primary-foreground rounded-l-none border-l border-border/30"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 bg-popover border border-border shadow-lg z-50"
                            >
                              {profileMenuItems
                                .filter((i) => i.category === "medical")
                                .map((item) => (
                                  <DropdownMenuItem
                                    key={item.label}
                                    className="text-sm gap-2.5 cursor-pointer hover:bg-muted py-2"
                                  >
                                    <item.icon className="h-4 w-4 text-primary" />
                                    {item.label}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuSeparator />
                              {profileMenuItems
                                .filter((i) => i.category === "services")
                                .map((item) => (
                                  <DropdownMenuItem
                                    key={item.label}
                                    className="text-sm gap-2.5 cursor-pointer hover:bg-muted py-2"
                                  >
                                    <item.icon className="h-4 w-4 text-tertiary" />
                                    {item.label}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuSeparator />
                              {profileMenuItems
                                .filter((i) => i.category === "health")
                                .map((item) => (
                                  <DropdownMenuItem
                                    key={item.label}
                                    className="text-sm gap-2.5 cursor-pointer hover:bg-muted py-2"
                                  >
                                    <item.icon className="h-4 w-4 text-success" />
                                    {item.label}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuSeparator />
                              {profileMenuItems
                                .filter(
                                  (i) =>
                                    i.category === "notes" ||
                                    i.category === "incident",
                                )
                                .map((item) => (
                                  <DropdownMenuItem
                                    key={item.label}
                                    className="text-sm gap-2.5 cursor-pointer hover:bg-muted py-2"
                                  >
                                    <item.icon
                                      className={`h-4 w-4 ${
                                        item.category === "incident"
                                          ? "text-destructive"
                                          : "text-tertiary"
                                      }`}
                                    />
                                    {item.label}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <AddIndividualDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
        />
      </main>
    </AppShell>
  );
}
