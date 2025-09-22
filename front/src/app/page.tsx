'use client';

import Image from "next/image";
import { useState } from "react";
import { testClasses, getBestCardsForDeck, debugKitasanBlack } from "./utils/testClasses";

export default function Home() {
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
      <h1 className="text-5xl font-bold mb-8">Tachyons lab</h1>
      <h2 className="text-2xl mb-8">A Tierlist and Deckbuilder combined</h2>
      
      <div className="mb-8 bg-black flex gap-4">
        <button 
          onClick={runTest}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
        >
          {isLoading ? 'Testing...' : 'Test Converted Classes'}
        </button>
        
        <button 
          onClick={runDebug}
          disabled={isDebugging}
          className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
        >
          {isDebugging ? 'Debugging...' : 'Debug Kitasan Black Only'}
        </button>
      </div>

      {testResult && (
        <div className="w-full max-w-4xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded border border-gray-300 dark:border-gray-600 mb-4">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Test Result: {testResult.success ? '✅ Success' : '❌ Failed'}
          </h3>
          <pre className="text-sm overflow-auto text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-3 rounded border">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {debugResult && (
        <div className="w-full max-w-4xl bg-green-50 dark:bg-green-900 text-gray-900 dark:text-gray-100 p-4 rounded border border-green-300 dark:border-green-600">
          <h3 className="text-xl font-bold mb-4 text-green-800 dark:text-green-200">
            Debug Result (Kitasan Black): {debugResult.success ? '✅ Success' : '❌ Failed'}
          </h3>
          <pre className="text-sm overflow-auto text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-3 rounded border">
            {JSON.stringify(debugResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
