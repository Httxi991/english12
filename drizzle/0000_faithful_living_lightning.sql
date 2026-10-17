CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`login_id` text NOT NULL,
	`credential_hash` text NOT NULL,
	`must_change` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`last_active` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_login_unique` ON `accounts` (`login_id`);--> statement-breakpoint
CREATE INDEX `account_roster` ON `accounts` (`role`,`created_at`);--> statement-breakpoint
CREATE TABLE `account_progress` (
	`account_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `limit_expiry` ON `request_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `account_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_account` ON `account_sessions` (`account_id`);--> statement-breakpoint
CREATE INDEX `session_expiry` ON `account_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `classroom_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`course_version` text NOT NULL,
	`answer` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scores_json` text,
	`comment` text,
	`teacher_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submission_student` ON `classroom_submissions` (`student_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `submission_queue` ON `classroom_submissions` (`status`,`created_at`);