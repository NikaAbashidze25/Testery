
'use client';

import { useState } from 'react';
import './styles.css';
import {
  AlertTriangle,
  AlertCircle,
  List,
  Lightbulb,
  Code,
  Server,
  Heading,
  Monitor,
  Cookie,
  Construction,
} from 'lucide-react';

export default function Next15MigrationPage() {
  const [activeTab, setActiveTab] = useState(0);

  const switchTab = (tabIndex: number) => {
    setActiveTab(tabIndex);
  };

  return (
    <div className="next15-migration-body">
      <div className="container">
        <header>
          <h1>Next.js 15 Asynchronous APIs</h1>
          <div className="subtitle">
            Understanding the migration from synchronous to asynchronous dynamic APIs
          </div>
          <div className="warning-badge">
            <AlertTriangle className="inline-block mr-2" /> Important Changes in Next.js 15
          </div>
        </header>

        <div className="tab-container">
          <div className={`tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => switchTab(0)}>
            Overview
          </div>
          <div className={`tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => switchTab(1)}>
            Server Components
          </div>
          <div className={`tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => switchTab(2)}>
            Client Components
          </div>
          <div className={`tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => switchTab(3)}>
            Migration Tools
          </div>
        </div>

        <div className={`tab-content ${activeTab === 0 ? 'active' : ''}`}>
          <div className="cards-container">
            <div className="card">
              <h2>
                <AlertCircle className="icon" /> Why This Change?
              </h2>
              <p>
                Next.js 15 has made several previously synchronous APIs asynchronous to support dynamic rendering and
                improve performance.
              </p>

              <div className="code-block bad">
                <code>
                  <span className="code-comment">// OLD: Synchronous access (now deprecated)</span>
                  <br />
                  <span className="code-keyword">function</span> <span className="code-function">Page</span>
                  {'({ params }) {'}
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">return</span> &lt;p&gt;ID: {'{params.id}'}&lt;/p&gt;;
                  <br />
                  {'}'}
                </code>
              </div>

              <div className="code-block good">
                <code>
                  <span className="code-comment">// NEW: Asynchronous access</span>
                  <br />
                  <span className="code-keyword">async function</span> <span className="code-function">Page</span>
                  {'({ params }) {'}
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">asyncParams</span> = <span className="code-keyword">await</span> params;
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">return</span> &lt;p&gt;ID:{' '}
                  {'{asyncParams.id}'}&lt;/p&gt;;
                  <br />
                  {'}'}
                </code>
              </div>
            </div>

            <div className="card">
              <h2>
                <List className="icon" /> Affected APIs
              </h2>
              <p>The following APIs are now asynchronous in Next.js 15:</p>
              <ul>
                <li>
                  <code>params</code> and <code>searchParams</code> props
                </li>
                <li>
                  <code>cookies()</code> from <code>next/headers</code>
                </li>
                <li>
                  <code>draftMode()</code> from <code>next/headers</code>
                </li>
                <li>
                  <code>headers()</code> from <code>next/headers</code>
                </li>
              </ul>

              <div className="info-box">
                <h3>
                  <Lightbulb className="icon" /> Good to Know
                </h3>
                <p>
                  You can delay unwrapping the Promise until you actually need to consume the value. This allows
                  Next.js to statically render more of your page.
                </p>
              </div>
            </div>

            <div className="card">
              <h2>
                <Code className="icon" /> Iteration Changes
              </h2>
              <p>Enumerating or iterating over these APIs also requires async handling:</p>

              <div className="code-block bad">
                <code>
                  <span className="code-comment">// OLD: Synchronous iteration</span>
                  <br />
                  <span className="code-keyword">for</span> (<span className="code-keyword">const</span>{' '}
                  <span className="code-var">cookie</span> <span className="code-keyword">of</span> cookies()) {'{'}
                  <br />
                  &nbsp;&nbsp;<span className="code-comment">// ...</span>
                  <br />
                  {'}'}
                </code>
              </div>

              <div className="code-block good">
                <code>
                  <span className="code-comment">// NEW: Asynchronous iteration</span>
                  <br />
                  <span className="code-keyword">const</span> <span className="code-var">asyncCookies</span> ={' '}
                  <span className="code-keyword">await</span> cookies();
                  <br />
                  <span className="code-keyword">for</span> (<span className="code-keyword">const</span>{' '}
                  <span className="code-var">cookie</span> <span className="code-keyword">of</span> asyncCookies) {'{'}
                  <br />
                  &nbsp;&nbsp;<span className="code-comment">// ...</span>
                  <br />
                  {'}'}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className={`tab-content ${activeTab === 1 ? 'active' : ''}`}>
          <div className="cards-container">
            <div className="card">
              <h2>
                <Server className="icon" /> Server Components
              </h2>
              <p>In Server Components, you must use <code>await</code> to access the dynamic API properties:</p>

              <div className="code-block">
                <code>
                  <span className="code-comment">// Server Component example</span>
                  <br />
                  <span className="code-keyword">async function</span> <span className="code-function">Page</span>
                  {'({ params, searchParams }) {'}
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">asyncParams</span> = <span className="code-keyword">await</span> params;
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">asyncSearchParams</span> ={' '}
                  <span className="code-keyword">await</span> searchParams;
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">cookiesList</span> = <span className="code-keyword">await</span>{' '}
                  cookies();
                  <br />
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">return</span> (
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;div&gt;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;h1&gt;Profile: {'{asyncParams.id}'}&lt;/h1&gt;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;p&gt;Search: {'{asyncSearchParams.query}'}&lt;/p&gt;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;/div&gt;
                  <br />
                  &nbsp;&nbsp;);
                  <br />
                  {'}'}
                </code>
              </div>
            </div>

            <div className="card">
              <h2>
                <Heading className="icon" /> Headers Example
              </h2>
              <p>Accessing headers asynchronously in Server Components:</p>

              <div className="code-block">
                <code>
                  <span className="code-keyword">import</span> {'{ headers }'}{' '}
                  <span className="code-keyword">from</span> <span className="code-string">'next/headers'</span>;
                  <br />
                  <br />
                  <span className="code-keyword">async function</span> <span className="code-function">UserPage</span>
                  () {'{'}
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">headersList</span> = <span className="code-keyword">await</span> headers();
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">userAgent</span> = headersList.get(
                  <span className="code-string">'user-agent'</span>);
                  <br />
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">return</span> (
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;div&gt;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;p&gt;Your user agent: {'{userAgent}'}&lt;/p&gt;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;/div&gt;
                  <br />
                  &nbsp;&nbsp;);
                  <br />
                  {'}'}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className={`tab-content ${activeTab === 2 ? 'active' : ''}`}>
          <div className="cards-container">
            <div className="card">
              <h2>
                <Monitor className="icon" /> Client Components
              </h2>
              <p>In Client Components, you must use <code>React.use()</code> to unwrap the Promise:</p>

              <div className="code-block">
                <code>
                  <span className="code-comment">// Client Component example</span>
                  <br />
                  <span className="code-string">'use client'</span>;
                  <br />
                  <br />
                  <span className="code-keyword">import</span> * <span className="code-keyword">as</span> React{' '}
                  <span className="code-keyword">from</span> <span className="code-string">'react'</span>;
                  <br />
                  <br />
                  <span className="code-keyword">function</span> <span className="code-function">ClientPage</span>
                  {'({ params }) {'}
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">asyncParams</span> = React.use(params);
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">return</span> &lt;p&gt;ID:{' '}
                  {'{asyncParams.id}'}&lt;/p&gt;;
                  <br />
                  {'}'}
                </code>
              </div>
            </div>

            <div className="card">
              <h2>
                <Cookie className="icon" /> Cookies in Client Components
              </h2>
              <p>Handling cookies in Client Components requires the use() hook:</p>

              <div className="code-block">
                <code>
                  <span className="code-string">'use client'</span>;
                  <br />
                  <br />
                  <span className="code-keyword">import</span> * <span className="code-keyword">as</span> React{' '}
                  <span className="code-keyword">from</span> <span className="code-string">'react'</span>;
                  <br />
                  <span className="code-keyword">import</span> {'{ cookies }'}{' '}
                  <span className="code-keyword">from</span> <span className="code-string">'next/headers'</span>;
                  <br />
                  <br />
                  <span className="code-keyword">function</span>{' '}
                  <span className="code-function">UserPreferences</span>() {'{'}
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">cookieStore</span> = React.use(cookies());
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span>{' '}
                  <span className="code-var">theme</span> = cookieStore.get(
                  <span className="code-string">'theme'</span>);
                  <br />
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">return</span> (
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;div&gt;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;p&gt;Current theme: {'{theme?.value}'}&lt;/p&gt;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;/div&gt;
                  <br />
                  &nbsp;&nbsp;);
                  <br />
                  {'}'}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className={`tab-content ${activeTab === 3 ? 'active' : ''}`}>
          <div className="cards-container">
            <div className="card">
              <h2>
                <Construction className="icon" /> Codemod Migration
              </h2>
              <p>Next.js provides a codemod to automatically fix many of these cases:</p>

              <div className="code-block">
                <code>
                  <span className="code-comment"># Run the codemod to migrate your code</span>
                  <br />
                  npx @next/codemod@canary next-async-request-api .
                </code>
              </div>

              <p>The codemod will attempt to automatically migrate your code, but some cases may require manual intervention.</p>
            </div>

            <div className="card">
              <h2>
                <AlertTriangle className="icon" /> Unmigratable Cases
              </h2>
              <p>For cases that can't be automatically migrated, the codemod will leave comments with instructions:</p>

              <div className="code-block">
                <code>
                  <span className="code-keyword">export function</span>{' '}
                  <span className="code-function">MyComponent</span>() {'{'}
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">const</span> <span className="code-var">c</span> ={' '}
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="code-comment">
                    /* @next-codemod-error Manually await this call and refactor the function to be async */
                  </span>
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;cookies();
                  <br />
                  &nbsp;&nbsp;<span className="code-keyword">return</span> c.get(
                  <span className="code-string">'name'</span>);
                  <br />
                  {'}'}
                </code>
              </div>

              <p>
                You must address these comments or use <code>@next-codemod-ignore</code> if no action is needed.
              </p>
            </div>
          </div>
        </div>

        <div className="info-box">
          <h3>
            <Lightbulb className="icon" /> Migration Strategy
          </h3>
          <p>1. Run the codemod to handle automatic migrations</p>
          <p>2. Review any comments left by the codemod for manual changes</p>
          <p>3. Test your application thoroughly after migration</p>
          <p>4. Use the linter to identify any remaining issues</p>
        </div>

        <div className="footer">
          <p>Next.js 15 Asynchronous API Migration Guide | Created with ❤️ for developers</p>
        </div>
      </div>
    </div>
  );
}
