"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Users,
  Briefcase,
  Calendar,
  Car,
  Building2,
  HeartPulse,
  ChefHat,
  Banknote,
  Activity,
  UserCheck,
  Lock,
  Clock,
  MapPin,
  IdCard,
  Layers,
} from "lucide-react";
import type { RootState } from "@/store/store";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "@/store/store";
import { toast } from "sonner";
import { changePassword } from "@/lib/AuthSlice";
import { fetchMyProfile } from "@/lib/UserSlice";

// ── Role colour map ──────────────────────────────────────────────────────────
const ROLE_STYLES: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  admin: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  "senior-teacher": {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  teacher: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  student: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  guardian: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  bursar: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  nurse: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  chef: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
  driver: {
    bg: "bg-black",
    text: "text-white",
    border: "border-black-200",
    dot: "bg-white",
  },
};

const DEFAULT_ROLE_STYLE = {
  bg: "bg-gray-50",
  text: "text-gray-700",
  border: "border-gray-200",
  dot: "bg-gray-500",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
function formatRole(role: string) {
  return (role || "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
function fmt(val?: string | null) {
  return (
    val ?? <span className="text-muted-foreground italic text-xs">Not set</span>
  );
}
function fmtDate(val?: string | null) {
  if (!val)
    return (
      <span className="text-muted-foreground italic text-xs">Not set</span>
    );
  return new Date(val).toLocaleDateString(undefined, { dateStyle: "medium" });
}

// ── Primitives ────────────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p
          className={`text-sm font-medium text-foreground truncate ${mono ? "font-mono text-xs" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="px-5 divide-y">{children}</div>
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  value,
  visible,
  error,
  disabled,
  onChange,
  onToggle,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  visible: boolean;
  error: string;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`bg-background border-input text-foreground pr-10 ${error ? "border-destructive" : ""}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={onToggle}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Role panels ───────────────────────────────────────────────────────────────
function TeacherPanel({ details }: { details: any }) {
  return (
    <>
      <Section title="Teaching Details" icon={GraduationCap}>
        <InfoRow
          icon={IdCard}
          label="Teacher ID"
          value={fmt(details.teacherIdNumber)}
          mono
        />
        <InfoRow
          icon={Briefcase}
          label="Employment Type"
          value={fmt(details.employmentType)}
        />
        <InfoRow icon={User} label="Gender" value={fmt(details.gender)} />
        <InfoRow
          icon={Calendar}
          label="Join Date"
          value={fmtDate(details.joinDate)}
        />
        <InfoRow
          icon={Building2}
          label="Department"
          value={fmt(details.department?.name)}
        />
      </Section>
      {details.subjectAssignments?.length > 0 && (
        <Section title="Subject Assignments" icon={BookOpen}>
          {details.subjectAssignments.map((sa: any) => (
            <div key={sa.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {sa.subject?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sa.subject?.code} · {sa.academicYear}
                  </p>
                </div>
              </div>
              {sa.isPrimary && (
                <Badge variant="secondary" className="text-[10px]">
                  Primary
                </Badge>
              )}
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

function StudentPanel({ details }: { details: any }) {
  const className = details.class
    ? `${details.class.grade?.name || ""} ${details.class.classname?.name || ""}`.trim()
    : null;
  return (
    <>
      <Section title="Student Details" icon={GraduationCap}>
        <InfoRow
          icon={IdCard}
          label="Student ID"
          value={fmt(details.studentIdNumber)}
          mono
        />
        <InfoRow icon={User} label="Gender" value={fmt(details.gender)} />
        <InfoRow
          icon={Calendar}
          label="Date of Birth"
          value={fmtDate(details.dateOfBirth)}
        />
        <InfoRow icon={Layers} label="Class" value={fmt(className)} />
      </Section>
      {details.guardians?.length > 0 && (
        <Section title="Guardians" icon={Users}>
          {details.guardians.map((g: any) => (
            <div key={g.id} className="py-3 space-y-0.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {g.user?.name}
                </p>
                {g.guardianstudents?.relationshipToStudent && (
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {g.guardianstudents.relationshipToStudent}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {g.user?.email} · {g.phone}
              </p>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

function GuardianPanel({ details }: { details: any }) {
  return (
    <>
      <Section title="Guardian Details" icon={Users}>
        <InfoRow icon={User} label="Gender" value={fmt(details.gender)} />
        <InfoRow icon={Phone} label="Phone" value={fmt(details.phone)} />
        <InfoRow icon={Mail} label="Email" value={fmt(details.email)} />
        <InfoRow
          icon={Briefcase}
          label="Occupation"
          value={fmt(details.occupation)}
        />
        <InfoRow icon={MapPin} label="Address" value={fmt(details.address)} />
      </Section>
      {details.students?.length > 0 && (
        <Section title="My Students" icon={GraduationCap}>
          {details.students.map((s: any) => {
            const cn = s.class
              ? `${s.class.grade?.name || ""} ${s.class.classname?.name || ""}`.trim()
              : null;
            return (
              <div key={s.id} className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {s.user?.name}
                  </p>
                  {s.guardianstudents?.relationshipToStudent && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize"
                    >
                      {s.guardianstudents.relationshipToStudent}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.studentIdNumber}
                  {cn ? ` · ${cn}` : ""}
                </p>
              </div>
            );
          })}
        </Section>
      )}
    </>
  );
}

function DriverPanel({ details }: { details: any }) {
  return (
    <Section title="Driver Details" icon={Car}>
      <InfoRow
        icon={IdCard}
        label="License Number"
        value={fmt(details.licenseNumber)}
        mono
      />
      <InfoRow
        icon={Briefcase}
        label="Experience"
        value={
          details.experienceYears ? `${details.experienceYears} years` : null
        }
      />
      <InfoRow icon={Phone} label="Phone" value={fmt(details.phoneNumber)} />
      <InfoRow icon={Activity} label="Status" value={fmt(details.status)} />
      <InfoRow
        icon={Calendar}
        label="Join Date"
        value={fmtDate(details.joinDate)}
      />
      <InfoRow
        icon={HeartPulse}
        label="Medical Cert Expiry"
        value={fmtDate(details.medicalCertificateExpiry)}
      />
      {details.emergencyContact && (
        <>
          <InfoRow
            icon={UserCheck}
            label="Emergency Contact"
            value={fmt(details.emergencyContact.name)}
          />
          <InfoRow
            icon={Phone}
            label="Emergency Phone"
            value={fmt(details.emergencyContact.phone)}
          />
          <InfoRow
            icon={Users}
            label="Relationship"
            value={fmt(details.emergencyContact.relationship)}
          />
        </>
      )}
    </Section>
  );
}

function ChefPanel({ details }: { details: any }) {
  return (
    <Section title="Chef Details" icon={ChefHat}>
      <InfoRow
        icon={IdCard}
        label="Staff ID"
        value={fmt(details.staffId)}
        mono
      />
      <InfoRow
        icon={Briefcase}
        label="Employment Type"
        value={fmt(details.employmentType)}
      />
      <InfoRow icon={User} label="Gender" value={fmt(details.gender)} />
      <InfoRow
        icon={GraduationCap}
        label="Qualification"
        value={fmt(details.qualification)}
      />
      <InfoRow
        icon={Calendar}
        label="Join Date"
        value={fmtDate(details.joinDate)}
      />
      <InfoRow
        icon={UserCheck}
        label="Status"
        value={
          details.isActive !== undefined ? (
            <span
              className={details.isActive ? "text-green-600" : "text-red-600"}
            >
              {details.isActive ? "Active" : "Inactive"}
            </span>
          ) : (
            fmt(null)
          )
        }
      />
    </Section>
  );
}

function bursarPanel({ details }: { details: any }) {
  return (
    <Section title="Bursar Details" icon={Banknote}>
      <InfoRow
        icon={IdCard}
        label="Staff ID"
        value={fmt(details.employeeId)}
        mono
      />
      <InfoRow
        icon={Briefcase}
        label="Employment Type"
        value={fmt(details.employmentType)}
      />
      <InfoRow icon={User} label="Gender" value={fmt(details.gender)} />
      <InfoRow
        icon={GraduationCap}
        label="Qualification"
        value={fmt(details.qualification)}
      />
      <InfoRow
        icon={Calendar}
        label="Join Date"
        value={fmtDate(details.joinDate)}
      />
      <InfoRow
        icon={UserCheck}
        label="Status"
        value={
          details.isActive !== undefined ? (
            <span
              className={details.isActive ? "text-green-600" : "text-red-600"}
            >
              {details.isActive ? "Active" : "Inactive"}
            </span>
          ) : (
            fmt(null)
          )
        }
      />
    </Section>
  );
}

const ROLE_PANEL: Record<string, React.ElementType> = {
  teacher: TeacherPanel,
  "senior-teacher": TeacherPanel,
  student: StudentPanel,
  guardian: GuardianPanel,
  driver: DriverPanel,
  chef: ChefPanel,
  bursar: bursarPanel,
};

const ROLE_ICON: Record<string, React.ElementType> = {
  admin: Shield,
  "senior-teacher": GraduationCap,
  teacher: GraduationCap,
  student: BookOpen,
  guardian: Users,
  driver: Car,
  bursar: Banknote,
  nurse: HeartPulse,
  chef: ChefHat,
  "sports-director": Activity,
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const {
    user,
    isLoading: authLoading,
    error: authError,
    success,
  } = useSelector((state: RootState) => state.auth);
  const { currentUserProfile, isLoading: profileLoading } = useSelector(
    (state: RootState) => state.users,
  );
  const dispatch = useDispatch<AppDispatch>();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [pwErrors, setPwErrors] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    dispatch(fetchMyProfile());
  }, [dispatch]);

  useEffect(() => {
    if (success?.toLowerCase().includes("password")) {
      toast.success("Password changed successfully");
      setChangePasswordOpen(false);
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPwErrors({ oldPassword: "", newPassword: "", confirmPassword: "" });
    }
    if (authError && changePasswordOpen)
      toast.error(authError || "Error changing password");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, authError]);

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((p) => ({ ...p, [name]: value }));
    if (pwErrors[name as keyof typeof pwErrors])
      setPwErrors((p) => ({ ...p, [name]: "" }));
  };
  const togglePw = (f: keyof typeof showPw) =>
    setShowPw((p) => ({ ...p, [f]: !p[f] }));

  const validatePw = () => {
    const e = { oldPassword: "", newPassword: "", confirmPassword: "" };
    let ok = true;
    if (!passwords.oldPassword) {
      e.oldPassword = "Current password is required";
      ok = false;
    }
    if (!passwords.newPassword) {
      e.newPassword = "New password is required";
      ok = false;
    } else if (passwords.newPassword.length < 6) {
      e.newPassword = "Must be at least 6 characters";
      ok = false;
    }
    if (!passwords.confirmPassword) {
      e.confirmPassword = "Please confirm your password";
      ok = false;
    } else if (passwords.newPassword !== passwords.confirmPassword) {
      e.confirmPassword = "Passwords do not match";
      ok = false;
    }
    if (
      passwords.oldPassword &&
      passwords.newPassword &&
      passwords.oldPassword === passwords.newPassword
    ) {
      e.newPassword = "Must differ from current password";
      ok = false;
    }
    setPwErrors(e);
    return ok;
  };

  const handleSavePw = async () => {
    if (!validatePw()) return;
    setPasswordLoading(true);
    try {
      await dispatch(
        changePassword({
          oldPassword: passwords.oldPassword,
          newPassword: passwords.newPassword,
        }),
      ).unwrap();
    } catch {
      /* handled above */
    } finally {
      setPasswordLoading(false);
    }
  };

  const onDialogChange = (open: boolean) => {
    setChangePasswordOpen(open);
    if (!open) {
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPwErrors({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setShowPw({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    }
  };

  // Derived
  const profile = currentUserProfile?.user;
  const roleDetails = currentUserProfile?.roleDetails;
  const role = user?.role || "";
  const RoleIcon = ROLE_ICON[role] ?? Shield;
  const RolePanel = ROLE_PANEL[role] ?? null;
  const isLoading = authLoading || profileLoading;
  const roleStyle = ROLE_STYLES[role] ?? DEFAULT_ROLE_STYLE;

  const displayName = profile?.name || user?.name || "";
  const displayEmail = profile?.email || user?.email || "";
  const displayPhone = profile?.phone;
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    : null;
  const isActive = profile?.isActive;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className={`h-24 w-full ${roleStyle.bg} relative`}>
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                          radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
                backgroundSize: "30px 30px",
              }}
            />
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg z-5">
                  <AvatarImage src="" alt={displayName} />
                  <AvatarFallback
                    className={`text-xl font-bold ${roleStyle.bg} ${roleStyle.text}`}
                  >
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  {isLoading && !displayName ? (
                    <div className="h-6 w-40 bg-muted rounded animate-pulse mb-1" />
                  ) : (
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      {displayName}
                    </h2>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {displayEmail}
                  </p>
                </div>
              </div>
              <div
                className={`self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${roleStyle.dot}`} />
                {formatRole(role)}
              </div>
            </div>

            {/* quick-stat strip */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Status",
                  value:
                    isActive !== undefined
                      ? isActive
                        ? "Active"
                        : "Inactive"
                      : "—",
                },
                { label: "Role", value: formatRole(role) || "—" },
                { label: "Member Since", value: memberSince || "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg bg-muted/30 border px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Base info grid ─────────────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Account Information" icon={User}>
            <InfoRow icon={User} label="Full Name" value={fmt(displayName)} />
            <InfoRow icon={Mail} label="Email" value={fmt(displayEmail)} />
            <InfoRow icon={Phone} label="Phone" value={fmt(displayPhone)} />
          </Section>

          <Section title="Identity & Access" icon={Shield}>
            <InfoRow icon={Shield} label="Role" value={fmt(formatRole(role))} />
            <InfoRow
              icon={UserCheck}
              label="Account Status"
              value={
                isActive !== undefined ? (
                  <span
                    className={isActive ? "text-green-600" : "text-red-600"}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                ) : (
                  fmt(null)
                )
              }
            />
            {memberSince && (
              <InfoRow
                icon={Calendar}
                label="Member Since"
                value={memberSince}
              />
            )}
          </Section>
        </div>

        {/* ── Role-specific details ──────────────────────────────────────── */}
        {isLoading && !roleDetails && (
          <div className="rounded-xl border bg-card p-8 flex items-center justify-center gap-3 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            <span className="text-sm">Loading details…</span>
          </div>
        )}
        {RolePanel && roleDetails && <RolePanel details={roleDetails} />}

        {/* ── Security ──────────────────────────────────────────────────── */}
        <Section title="Security" icon={Key}>
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  Password
                </p>
                <p className="text-sm font-medium text-foreground tracking-widest">
                  ••••••••••
                </p>
              </div>
            </div>
            <Dialog open={changePasswordOpen} onOpenChange={onDialogChange}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  Change
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-foreground">
                    <Key className="w-4 h-4" /> Change Password
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Update your password to keep your account secure.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <PasswordField
                    id="oldPassword"
                    name="oldPassword"
                    label="Current Password"
                    value={passwords.oldPassword}
                    visible={showPw.oldPassword}
                    error={pwErrors.oldPassword}
                    disabled={passwordLoading}
                    onChange={handlePwChange}
                    onToggle={() => togglePw("oldPassword")}
                  />
                  <PasswordField
                    id="newPassword"
                    name="newPassword"
                    label="New Password"
                    value={passwords.newPassword}
                    visible={showPw.newPassword}
                    error={pwErrors.newPassword}
                    disabled={passwordLoading}
                    onChange={handlePwChange}
                    onToggle={() => togglePw("newPassword")}
                  />
                  <PasswordField
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm New Password"
                    value={passwords.confirmPassword}
                    visible={showPw.confirmPassword}
                    error={pwErrors.confirmPassword}
                    disabled={passwordLoading}
                    onChange={handlePwChange}
                    onToggle={() => togglePw("confirmPassword")}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    disabled={passwordLoading}
                    onClick={() => onDialogChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={passwordLoading}
                    onClick={handleSavePw}
                    className="flex items-center gap-2"
                  >
                    {passwordLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Changing…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Change Password
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <InfoRow
            icon={Clock}
            label="Session Started"
            value={new Date().toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </Section>
      </div>
    </div>
  );
}
