CREATE TABLE `checks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`habit` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`icon` text NOT NULL,
	`goal` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`budget` integer DEFAULT 300000 NOT NULL,
	`pet_name` text DEFAULT '团团' NOT NULL,
	`feeds` integer DEFAULT 0 NOT NULL,
	`focus` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`amount` integer NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`note` text NOT NULL,
	`date` text NOT NULL
);
