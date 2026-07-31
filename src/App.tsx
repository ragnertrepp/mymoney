import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import "./App.css";

type TransactionType = "income" | "expense";
type MainTab = "info" | "loans" | "calendar" | "notes";
type InfoTab = "overview" | "budget" | "canbuy";
type LoansTab = "cashout" | "cashin";
type CalendarTab = "calendar" | "todo";
type QuickMode = "expense" | "income" | "loan" | "todo" | null;

type Transaction = { id: string; name