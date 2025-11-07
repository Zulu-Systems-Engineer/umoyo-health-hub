# Umoyo Health Hub - UI Overview

This document outlines the User Interface (UI) for the Umoyo Health Hub, as specified in the RAG Implementation Plan. [cite_start]The UI is clean, responsive, and role-based, built using React, shadcn/ui, and Tailwind CSS[cite: 46].

## 1. UI Screen: Role Selector

This is the application's entry point, designed to identify the user type before they access the chat interface.

[cite_start]**File:** `apps/web/src/components/RoleSelector.tsx` [cite: 576]

### Key Components:

* [cite_start]**Main Container:** A full-screen, centered layout with a gradient background[cite: 584].
* [cite_start]**Two-Card Layout:** The screen presents two distinct, clickable cards for user selection [cite: 585-586].

#### Card 1: Patient

* [cite_start]**Icon:** A large `UserCircle` icon[cite: 588].
* [cite_start]**Title:** "I'm a Patient" [cite: 589-590].
* [cite_start]**Description:** "Get reliable health information in simple language" [cite: 591-592].
* [cite_start]**Action:** A "Continue as Patient" button [cite: 594-599]. [cite_start]This action likely leads directly to the chat interface for public, non-authenticated use[cite: 401].

#### Card 2: Healthcare Professional

* [cite_start]**Icon:** A large `Stethoscope` icon[cite: 605].
* [cite_start]**Title:** "I'm a Healthcare Professional" [cite: 607-608].
* [cite_start]**Description:** "Access clinical guidelines and evidence-based protocols" [cite: 609-610].
* [cite_start]**Action:** A "Sign in as Professional" button [cite: 612-618]. [cite_start]This action implies an authentication step (login) is required to access the professional-grade chat [cite: 418, 751-753].

## 2. UI Screen: Main Chat Interface

This is the core application screen where users interact with the RAG-powered AI.

[cite_start]**File:** `apps/web/src/components/chat/ChatInterface.tsx` [cite: 468]

### Key Components:

#### 1. Message History

* [cite_start]**Layout:** A flexible, scrollable area that displays the list of messages [cite: 501-502].
* [cite_start]**Messages:** Each message (from both the user and the assistant) is rendered inside its own `Card` component[cite: 504].
    * **User Message:**
        * [cite_start]Icon: `User`[cite: 509].
        * [cite_start]Label: "You"[cite: 514].
        * [cite_start]Styling: Differentiated with a specific background (e.g., `bg-blue-50`) [cite: 504-505].
    * **Assistant Message:**
        * [cite_start]Icon: `Bot` [cite: 509-510].
        * [cite_start]Label: "MoyoHealth Assistant"[cite: 514].
        * [cite_start]Styling: Uses a standard background (e.g., `bg-gray-50`)[cite: 505].

#### 2. Citation Display

* **Function:** This is a critical feature integrated directly into the assistant's message cards.
* [cite_start]**Appearance:** Below the AI's text answer, a "Sources:" heading appears, followed by a list of clickable links [cite: 519-522].
* [cite_start]**Content:** Each link shows a title and is numbered (e.g., `[1] {cite.title}`), allowing the user to verify the information by visiting the source PDF or PubMed article [cite: 525-532].

#### 3. Input Form

* [cite_start]**Layout:** A form fixed to the bottom of the screen[cite: 555].
* [cite_start]**Text Input:** A multi-line `Textarea` component with placeholder text: "Ask about symptoms, treatments, medications..." [cite: 555-559].
* [cite_start]**Submit Button:** A `Button` component that shows a `Send` icon [cite: 563-571].

#### 4. Loading & Error States

* **Loading:** When a query is in progress (`queryMutation.isPending`):
    * [cite_start]A new card appears with a spinning `Loader2` icon and the text "Searching medical knowledge..." [cite: 542-550].
    * [cite_start]The `Textarea` and `Send` button are disabled to prevent duplicate submissions[cite: 562, 566].
* [cite_start]**Error Handling:** The UI is designed to show error states, although the specific visual implementation is handled by the `useMutation` hook's `onError` callback (not fully detailed in the snippet) [cite: 480-489].