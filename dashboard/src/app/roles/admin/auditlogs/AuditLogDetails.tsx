"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Calendar,
  Clock,
  Globe,
  Smartphone,
  Hash,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { AuditLog } from "@/types/AuditLogTypes";
import { format } from "date-fns";

interface AuditLogDetailsProps {
  log: AuditLog;
}

export function AuditLogDetails({ log }: AuditLogDetailsProps) {
  const metadata = log.metadata || {};
  const user = log.user;

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch {
      return dateString;
    }
  };

  const getActionVariant = (
    action: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    const a = action.toLowerCase();
    if (["create", "created", "assign", "approve"].some((v) => a.includes(v)))
      return "default";
    if (
      ["update", "updated", "submit", "passwordchange"].some((v) =>
        a.includes(v),
      )
    )
      return "secondary";
    if (["delete", "remove", "reject"].some((v) => a.includes(v)))
      return "destructive";
    return "outline";
  };

  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return null;
    if (statusCode >= 200 && statusCode < 300)
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    if (statusCode >= 400 && statusCode < 500)
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Client Error
        </Badge>
      );
    if (statusCode >= 500)
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Server Error
        </Badge>
      );
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Action
              </div>
              <Badge
                variant={getActionVariant(log.action)}
                className="text-sm px-3 py-1"
              >
                {log.action}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Status
              </div>
              {getStatusBadge(metadata.statusCode) || (
                <span className="text-sm">N/A</span>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Entity</span>
              </div>
              <div className="ml-6">
                <div className="text-sm">{log.entity}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  ID: {log.entityId}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">User</span>
              </div>
              <div className="ml-6">
                {user ? (
                  <>
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">System</div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <div className="ml-6 text-sm">
                {formatDateTime(log.createdAt)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <div className="ml-6 text-sm">
                {format(new Date(log.createdAt), "HH:mm:ss")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">IP Address</span>
              </div>
              <div className="ml-6 text-sm font-mono">
                {metadata.ip || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">User Agent</span>
              </div>
              <div
                className="ml-6 text-xs text-muted-foreground break-all"
                title={metadata.userAgent}
              >
                {metadata.userAgent || "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes */}
      {metadata.changes && Object.keys(metadata.changes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metadata.changes).map(
                ([field, change]: [string, any]) => (
                  <div key={field} className="border rounded-lg p-3">
                    <div className="text-sm font-medium mb-2 capitalize">
                      {field}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Before
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-2 rounded font-mono text-xs">
                          {change.from !== undefined
                            ? JSON.stringify(change.from, null, 2)
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          After
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-2 rounded font-mono text-xs">
                          {change.to !== undefined
                            ? JSON.stringify(change.to, null, 2)
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metadata */}
      {metadata &&
        Object.keys(metadata).filter(
          (k) => !["ip", "userAgent", "statusCode", "changes"].includes(k),
        ).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(metadata).filter(
                      ([k]) =>
                        !["ip", "userAgent", "statusCode", "changes"].includes(
                          k,
                        ),
                    ),
                  ),
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
