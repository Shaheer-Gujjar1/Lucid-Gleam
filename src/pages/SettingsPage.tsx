import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Scale, Database, Upload, Settings as SettingsIcon } from "lucide-react";
import { AssignmentReminders } from "@/components/classes/AssignmentReminders";
import { BackupRestore } from "@/components/classes/BackupRestore";
import { CustomGradingScales } from "@/components/classes/CustomGradingScales";
import { BulkImport } from "@/components/classes/BulkImport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure your application preferences</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <div className="bg-card rounded-xl p-1.5 shadow-sm border border-border/50">
            <TabsList className="flex w-max gap-1 bg-transparent p-0">
              <TabsTrigger value="general" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <SettingsIcon className="h-4 w-4" />
                <span>General</span>
              </TabsTrigger>
              <TabsTrigger value="reminders" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="h-4 w-4" />
                <span>Reminders</span>
              </TabsTrigger>
              <TabsTrigger value="scales" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Scale className="h-4 w-4" />
                <span>Grading Scales</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Upload className="h-4 w-4" />
                <span>Bulk Import</span>
              </TabsTrigger>
              <TabsTrigger value="backup" className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Database className="h-4 w-4" />
                <span>Backup & Restore</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="general" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dark-mode" className="text-sm">Dark Mode</Label>
                  <Switch id="dark-mode" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="compact" className="text-sm">Compact View</Label>
                  <Switch id="compact" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notif" className="text-sm">Email Notifications</Label>
                  <Switch id="email-notif" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder" className="text-sm">Assignment Reminders</Label>
                  <Switch id="reminder" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <AssignmentReminders />
        </TabsContent>

        <TabsContent value="scales" className="mt-6">
          <CustomGradingScales />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <BulkImport />
        </TabsContent>

        <TabsContent value="backup" className="mt-6">
          <BackupRestore />
        </TabsContent>
      </Tabs>
    </div>
  );
}
