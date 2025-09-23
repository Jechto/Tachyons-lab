"use client";

import Image from "next/image";
import { useState } from "react";
import {
    testClasses,
    getBestCardsForDeck,
    debugKitasanBlack,
} from "../utils/testClasses";

export default function TestPage() {
    const [testResult, setTestResult] = useState<any>(null);
    const [debugResult, setDebugResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDebugging, setIsDebugging] = useState(false);

    const runTest = async () => {
        setIsLoading(true);
        try {
            const result = testClasses();
            setTestResult(result);
        } catch (error) {
            setTestResult({ success: false, error: error?.toString() });
        } finally {
            setIsLoading(false);
        }
    };

    const runDebug = async () => {
        setIsDebugging(true);
        try {
            const result = debugKitasanBlack();
            setDebugResult(result);
        } catch (error) {
            setDebugResult({ success: false, error: error?.toString() });
        } finally {
            setIsDebugging(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center p-24">
            <h1 className="text-4xl font-bold mb-4">Testing & Debug Console</h1>
            <p className="text-lg mb-8 text-gray-600 dark:text-gray-400">
                Development tools for testing converted classes and debugging
                calculations
            </p>

            <div className="mb-8 flex gap-4">
                <button
                    onClick={runTest}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                >
                    {isLoading ? "Testing..." : "Test Converted Classes"}
                </button>

                <button
                    onClick={runDebug}
                    disabled={isDebugging}
                    className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
                >
                    {isDebugging ? "Debugging..." : "Debug Kitasan Black Only"}
                </button>

                <a
                    href="/"
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                    ← Back to Home
                </a>
            </div>

            {testResult && (
                <div className="w-full max-w-4xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded border border-gray-300 dark:border-gray-600 mb-4">
                    <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                        Test Result:{" "}
                        {testResult.success ? "✅ Success" : "❌ Failed"}
                    </h3>
                    <pre className="text-sm overflow-auto text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-3 rounded border max-h-96">
                        {JSON.stringify(testResult, null, 2)}
                    </pre>
                </div>
            )}

            {debugResult && (
                <div className="w-full max-w-4xl bg-green-50 dark:bg-green-900 text-gray-900 dark:text-gray-100 p-4 rounded border border-green-300 dark:border-green-600">
                    <h3 className="text-xl font-bold mb-4 text-green-800 dark:text-green-200">
                        Debug Result (Kitasan Black):{" "}
                        {debugResult.success ? "✅ Success" : "❌ Failed"}
                    </h3>
                    <pre className="text-sm overflow-auto text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-3 rounded border max-h-96">
                        {JSON.stringify(debugResult, null, 2)}
                    </pre>
                </div>
            )}

            <div className="mt-8 w-full max-w-4xl bg-blue-50 dark:bg-blue-900 p-4 rounded border border-blue-300 dark:border-blue-600">
                <h3 className="text-lg font-bold mb-2 text-blue-800 dark:text-blue-200">
                    🛠️ Development Notes
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>
                        • <strong>Test Converted Classes:</strong> Runs
                        comprehensive tests on all TypeScript classes
                    </li>
                    <li>
                        • <strong>Debug Kitasan Black:</strong> Tests a single
                        card (ID: 30028) for detailed debugging
                    </li>
                    <li>
                        • Check browser console for detailed logging during
                        execution
                    </li>
                    <li>
                        • Use Chrome DevTools for step-by-step debugging if
                        needed
                    </li>
                </ul>
            </div>
        </div>
    );
}
