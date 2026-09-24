import {
  Team,
  QuizQuestion,
  CodingProblem,
  CodeBidRiddle,
  RoundInfo,
  QuizSettings,
  CodeRushSettings,
  CodeBidSettings,
  LeaderboardSettings,
  MonitoringViolationSettings,
} from '../types/competition';

// 25 empty team slots created for the admin to register teams
export const INITIAL_TEAMS: Team[] = Array.from({ length: 25 }, (_, index) => {
  const num = index + 1;
  const id = `T${String(num).padStart(2, '0')}`;
  
  // First two slots pre-filled for immediate testing convenience with 0 points
  const isDemo = num <= 2;

  return {
    id,
    teamNumber: num,
    name: isDemo ? `Team ${String(num).padStart(2, '0')}` : '',
    members: isDemo ? [`Member A`, `Member B`] : [],
    passcode: `dv26-T${String(num).padStart(2, '0')}`,
    status: 'Active',
    registrationStatus: isDemo ? 'Registered' : 'Not Registered',
    qualifiedRounds: isDemo ? ['quiz'] : [],
    rank: num,
    quizScore: 0,
    codeScore: 0,
    bidScore: 0,
    totalScore: 0,
    coins: 100, // starting virtual coins for auction
  };
});

// Three official competition stages
export const INITIAL_ROUNDS: RoundInfo[] = [
  {
    id: 1,
    key: 'quiz',
    name: 'MindSprint',
    roundNumber: 1,
    status: 'READY',
    startTime: '10:15 AM',
    duration: '12m 30s',
    rules: [
      '25 questions covering core Computer Science concepts.',
      'Each question awards 2 points (Maximum: 50 points).',
      'Time limit: strictly 30 seconds per question.',
      'One-way question progression: questions cannot be revisited once completed or expired.',
      'Questions and answer choices are dynamically shuffled and preserved for your team.',
      'When the timer reaches zero, the system automatically advances to the next question.',
    ],
  },
  {
    id: 2,
    key: 'coding',
    name: 'CodeRush',
    roundNumber: 2,
    status: 'LOCKED',
    startTime: '10:50 AM',
    duration: '60 minutes',
    rules: [
      'Only teams qualified from Round 1 can enter Round 2.',
      '3 algorithmic problems: Easy (25 pts), Medium (35 pts), Hard (50 pts).',
      'Solutions are evaluated on the external contest judge platform.',
      'Top 5 teams proceed to Round 3 (CodeBid).',
    ],
  },
  {
    id: 3,
    key: 'bidding',
    name: 'CodeBid',
    roundNumber: 3,
    status: 'LOCKED',
    startTime: '12:00 PM',
    duration: '45 minutes',
    rules: [
      'Exclusive to the Top 5 qualifying teams from Round 2.',
      'Live bidding auction across 6 technical riddles.',
      'Highest bidder receives first opportunity to crack the riddle.',
      'Solving the riddle correctly awards DOUBLE the bid amount as points.',
      'If incorrect, opportunity passes sequentially to the next-highest bidder.',
    ],
  },
];

export const INITIAL_QUIZ_SETTINGS: QuizSettings = {
  title: 'MindSprint',
  totalQuestions: 25,
  pointsPerQuestion: 2,
  timePerQuestionSeconds: 30,
  durationMinutes: 12.5,
  shuffleQuestions: true,
  shuffleOptions: true,
  status: 'READY',
  eligibleTeamIds: INITIAL_TEAMS.map((t) => t.id),
};

export const DEFAULT_STARTER_CODES = {
  python: `# Solution in Python (3.8+)
import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    # Read input and solve problem
    

if __name__ == '__main__':
    solve()
`,
  c: `// Solution in C (GCC)
#include <stdio.h>
#include <stdlib.h>

int main() {
    // Read input from standard input
    // Write your solution here
    
    return 0;
}
`,
  cpp: `// Solution in C++ (GCC)
#include <iostream>
#include <vector>
#include <numeric>
#include <algorithm>
#include <unordered_map>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Read input and print output
    // Write your solution here
    
    return 0;
}
`,
  java: `// Solution in Java (OpenJDK)
import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Note: For Judge0, the class must be named Main
        // Write your solution here
        
    }
}
`,
  r: `# Solution in R
stdin_lines <- readLines(file("stdin"), warn = FALSE)
if (length(stdin_lines) > 0) {
    # Write your solution here
}
`,
};

export const INITIAL_CODERUSH_SETTINGS: CodeRushSettings = {
  externalContestUrl: 'https://vjudge.net/contest',
  durationMinutes: 60,
  startTime: '10:50 AM',
  startTimestampMs: 0,
  status: 'LOCKED',
  scoringMode: 'partial',
  qualifiedTeamIds: ['T01', 'T02'],
  problems: [
    {
      id: 'P1',
      name: 'Subarray XOR Equality',
      difficulty: 'Easy',
      points: 25,
      description: 'Given an array of integers A of size N and a target value K, find the number of contiguous subarrays whose bitwise XOR sum equals K. A contiguous subarray is a slice of consecutive elements from index i to j (0 <= i <= j < N).',
      inputFormat: 'First line: two space-separated integers N and K.\\nSecond line: N space-separated integers representing array A.',
      outputFormat: 'Print a single integer: the count of contiguous subarrays whose XOR sum equals K.',
      constraints: '1 <= N <= 100,000\\n0 <= K <= 1,000,000,000\\n0 <= A[i] <= 1,000,000,000',
      timeLimit: '1.0s',
      timeLimitSeconds: 1.0,
      memoryLimit: '128 MB',
      memoryLimitMb: 128,
      starterCode: {
        python: `# Subarray XOR Equality - Python 3
import sys
from collections import defaultdict

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    k = int(data[1])
    arr = [int(x) for x in data[2:2+n]]
    
    # Calculate count of subarrays with XOR sum == k
    count = 0
    pref = 0
    freq = defaultdict(int)
    freq[0] = 1
    for x in arr:
        pref ^= x
        target = pref ^ k
        count += freq[target]
        freq[pref] += 1
    print(count)

if __name__ == '__main__':
    solve()
`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2) return 0;
    long long *arr = (long long *)malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) {
        scanf("%lld", &arr[i]);
    }
    
    // Complete solution
    long long count = 0;
    for (int i = 0; i < n; i++) {
        long long cur = 0;
        for (int j = i; j < n; j++) {
            cur ^= arr[j];
            if (cur == k) count++;
        }
    }
    printf("%lld\\n", count);
    free(arr);
    return 0;
}
`,
        cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    long long k;
    if (!(cin >> n >> k)) return 0;
    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    
    unordered_map<long long, long long> freq;
    freq[0] = 1;
    long long pref = 0;
    long long ans = 0;
    for (int i = 0; i < n; i++) {
        pref ^= a[i];
        long long target = pref ^ k;
        if (freq.count(target)) ans += freq[target];
        freq[pref]++;
    }
    cout << ans << "\\n";
    return 0;
}
`,
        java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = null;
        String line = br.readLine();
        if (line == null) return;
        st = new StringTokenizer(line);
        int n = Integer.parseInt(st.nextToken());
        long k = Long.parseLong(st.nextToken());
        long[] arr = new long[n];
        int idx = 0;
        while (idx < n) {
            if (st == null || !st.hasMoreTokens()) {
                String l = br.readLine();
                if (l == null) break;
                st = new StringTokenizer(l);
            }
            arr[idx++] = Long.parseLong(st.nextToken());
        }
        
        Map<Long, Long> freq = new HashMap<>();
        freq.put(0L, 1L);
        long pref = 0;
        long ans = 0;
        for (int i = 0; i < n; i++) {
            pref ^= arr[i];
            long target = pref ^ k;
            ans += freq.getOrDefault(target, 0L);
            freq.put(pref, freq.getOrDefault(pref, 0L) + 1);
        }
        System.out.println(ans);
    }
}
`,
        r: `stdin_lines <- readLines(file("stdin"), warn = FALSE)
if (length(stdin_lines) > 0) {
    tokens <- unlist(strsplit(paste(stdin_lines, collapse=" "), "\\\\s+"))
    tokens <- tokens[tokens != ""]
    if (length(tokens) >= 2) {
        n <- as.integer(tokens[1])
        k <- as.numeric(tokens[2])
        if (length(tokens) >= 2 + n) {
            arr <- as.numeric(tokens[3:(2+n)])
            # Count subarrays
            ans <- 0
            for (i in 1:n) {
                cur <- 0
                for (j in i:n) {
                    cur <- bitwXor(cur, arr[j])
                    if (cur == k) ans <- ans + 1
                }
            }
            cat(ans, "\\n")
        }
    }
}
`,
      },
      examples: [
        {
          input: '4 6\\n4 2 2 6',
          output: '4',
          explanation: 'The subarrays are [4, 2] (4^2=6), [4, 2, 2, 6] (4^2^2^6=6), [2, 2, 6] (2^2^6=6), and [6] (6).',
        },
        {
          input: '3 0\\n1 2 3',
          output: '1',
          explanation: 'Subarray [1, 2, 3] gives 1 ^ 2 ^ 3 = 0.',
        },
      ],
      hiddenTestCases: [
        { id: 'tc1_1', input: '4 6\\n4 2 2 6', expectedOutput: '4' },
        { id: 'tc1_2', input: '3 0\\n1 2 3', expectedOutput: '1' },
        { id: 'tc1_3', input: '5 1\\n1 0 1 0 1', expectedOutput: '9' },
        { id: 'tc1_4', input: '1 5\\n5', expectedOutput: '1' },
        { id: 'tc1_5', input: '6 3\\n5 6 7 8 9 10', expectedOutput: '0' },
      ],
      judgeUrl: 'https://vjudge.net/contest',
    },
    {
      id: 'P2',
      name: 'Shortest Cycle in Directed Graph',
      difficulty: 'Medium',
      points: 35,
      description: 'Given a directed graph with N vertices (labeled 1 to N) and M directed edges, compute the length (number of edges) of the shortest directed simple cycle in the graph. If no directed cycle exists in the graph, output -1.',
      inputFormat: 'First line: two integers N and M.\\nNext M lines: each line contains two integers u and v denoting a directed edge from vertex u to vertex v.',
      outputFormat: 'Print the length of the shortest directed cycle, or -1 if the graph is a Directed Acyclic Graph (DAG).',
      constraints: '2 <= N <= 1000\\n1 <= M <= 2000\\n1 <= u, v <= N, u != v',
      timeLimit: '2.0s',
      timeLimitSeconds: 2.0,
      memoryLimit: '256 MB',
      memoryLimitMb: 256,
      starterCode: {
        python: `# Shortest Cycle in Directed Graph - Python 3
import sys
from collections import deque

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    m = int(lines[1])
    adj = [[] for _ in range(n + 1)]
    idx = 2
    for _ in range(m):
        if idx >= len(lines): break
        u = int(lines[idx]); v = int(lines[idx+1])
        adj[u].append(v)
        idx += 2
        
    ans = float('inf')
    # BFS from each vertex to find shortest cycle containing it
    for start in range(1, n + 1):
        dist = [-1] * (n + 1)
        q = deque([start])
        dist[start] = 0
        found = False
        while q and not found:
            curr = q.popleft()
            for nxt in adj[curr]:
                if nxt == start:
                    ans = min(ans, dist[curr] + 1)
                    found = True
                    break
                if dist[nxt] == -1:
                    dist[nxt] = dist[curr] + 1
                    q.append(nxt)
    print(-1 if ans == float('inf') else ans)

if __name__ == '__main__':
    solve()
`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    // Complete solution for shortest cycle
    return 0;
}
`,
        cpp: `#include <iostream>
#include <vector>
#include <queue>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n, m;
    if (!(cin >> n >> m)) return 0;
    vector<vector<int>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
    }
    
    int minCycle = 1e9;
    for (int start = 1; start <= n; start++) {
        vector<int> dist(n + 1, -1);
        queue<int> q;
        q.push(start);
        dist[start] = 0;
        bool found = false;
        while (!q.empty() && !found) {
            int curr = q.front();
            q.pop();
            for (int nxt : adj[curr]) {
                if (nxt == start) {
                    minCycle = min(minCycle, dist[curr] + 1);
                    found = true;
                    break;
                }
                if (dist[nxt] == -1) {
                    dist[nxt] = dist[curr] + 1;
                    q.push(nxt);
                }
            }
        }
    }
    
    if (minCycle > 1e8) cout << -1 << "\\n";
    else cout << minCycle << "\\n";
    return 0;
}
`,
        java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        StringTokenizer st = new StringTokenizer(line);
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            while (st == null || !st.hasMoreTokens()) {
                String l = br.readLine();
                if (l == null) break;
                st = new StringTokenizer(l);
            }
            int u = Integer.parseInt(st.nextToken());
            int v = Integer.parseInt(st.nextToken());
            adj.get(u).add(v);
        }
        int ans = Integer.MAX_VALUE;
        for (int start = 1; start <= n; start++) {
            int[] dist = new int[n + 1];
            Arrays.fill(dist, -1);
            Queue<Integer> q = new LinkedList<>();
            q.add(start);
            dist[start] = 0;
            boolean found = false;
            while (!q.isEmpty() && !found) {
                int cur = q.poll();
                for (int nxt : adj.get(cur)) {
                    if (nxt == start) {
                        ans = Math.min(ans, dist[cur] + 1);
                        found = true;
                        break;
                    }
                    if (dist[nxt] == -1) {
                        dist[nxt] = dist[cur] + 1;
                        q.add(nxt);
                    }
                }
            }
        }
        System.out.println(ans == Integer.MAX_VALUE ? -1 : ans);
    }
}
`,
        r: `# Solution in R
stdin_lines <- readLines(file("stdin"), warn = FALSE)
if (length(stdin_lines) > 0) {
    tokens <- unlist(strsplit(paste(stdin_lines, collapse=" "), "\\\\s+"))
    tokens <- tokens[tokens != ""]
    # Write solution
    cat("-1\\n")
}
`,
      },
      examples: [
        {
          input: '4 4\\n1 2\\n2 3\\n3 1\\n3 4',
          output: '3',
          explanation: 'Cycle: 1 -> 2 -> 3 -> 1 has length 3.',
        },
        {
          input: '4 3\\n1 2\\n2 3\\n3 4',
          output: '-1',
          explanation: 'The graph is a DAG with no cycles.',
        },
      ],
      hiddenTestCases: [
        { id: 'tc2_1', input: '4 4\\n1 2\\n2 3\\n3 1\\n3 4', expectedOutput: '3' },
        { id: 'tc2_2', input: '4 3\\n1 2\\n2 3\\n3 4', expectedOutput: '-1' },
        { id: 'tc2_3', input: '3 3\\n1 2\\n2 3\\n3 2', expectedOutput: '2' },
        { id: 'tc2_4', input: '5 6\\n1 2\\n2 3\\n3 4\\n4 5\\n5 1\\n2 4', expectedOutput: '4' },
        { id: 'tc2_5', input: '2 2\\n1 2\\n2 1', expectedOutput: '2' },
      ],
      judgeUrl: 'https://vjudge.net/contest',
    },
    {
      id: 'P3',
      name: 'Maximum Flow Energy Grid',
      difficulty: 'Hard',
      points: 50,
      description: 'An electrical distribution grid connects N substations labeled 1 through N via M directed transmission lines. Each line from substation u to v has a maximum transmission capacity of C units of power. Determine the maximum steady-state energy flow from generation plant 1 (source) to metropolitan distribution hub N (sink).',
      inputFormat: 'First line: two space-separated integers N and M.\\nNext M lines: three space-separated integers u, v, and c denoting a directed transmission line from substation u to substation v with capacity c.',
      outputFormat: 'Print a single integer representing the maximum total flow from substation 1 to substation N.',
      constraints: '2 <= N <= 500\\n1 <= M <= 5000\\n1 <= c <= 10,000,000',
      timeLimit: '2.0s',
      timeLimitSeconds: 2.0,
      memoryLimit: '256 MB',
      memoryLimitMb: 256,
      starterCode: {
        python: `# Maximum Flow Energy Grid - Python 3 (Edmonds-Karp / Dinic)
import sys
from collections import deque

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    m = int(lines[1])
    capacity = [{} for _ in range(n + 1)]
    idx = 2
    for _ in range(m):
        if idx >= len(lines): break
        u = int(lines[idx]); v = int(lines[idx+1]); c = int(lines[idx+2])
        capacity[u][v] = capacity[u].get(v, 0) + c
        if u not in capacity[v]:
            capacity[v][u] = 0
        idx += 3
        
    source = 1
    sink = n
    max_flow = 0
    
    # Edmonds-Karp BFS
    while True:
        parent = {source: None}
        q = deque([source])
        while q:
            curr = q.popleft()
            if curr == sink:
                break
            for nxt, cap in capacity[curr].items():
                if nxt not in parent and cap > 0:
                    parent[nxt] = curr
                    q.append(nxt)
        if sink not in parent:
            break
            
        # Find bottleneck capacity
        path_flow = float('inf')
        s = sink
        while s != source:
            p = parent[s]
            path_flow = min(path_flow, capacity[p][s])
            s = p
            
        # Update residual capacities
        v = sink
        while v != source:
            u = parent[v]
            capacity[u][v] -= path_flow
            capacity[v][u] += path_flow
            v = u
            
        max_flow += path_flow
        
    print(max_flow)

if __name__ == '__main__':
    solve()
`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) != 2) return 0;
    // Complete max flow implementation
    return 0;
}
`,
        cpp: `#include <iostream>
#include <vector>
#include <queue>
#include <cstring>
#include <algorithm>

using namespace std;

const long long INF = 1e18;

struct Edge {
    int to;
    long long cap;
    long long flow;
    int rev;
};

vector<vector<Edge>> adj;
vector<int> level, ptr;

bool bfs(int s, int t) {
    fill(level.begin(), level.end(), -1);
    level[s] = 0;
    queue<int> q;
    q.push(s);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (auto& edge : adj[v]) {
            if (edge.cap - edge.flow > 0 && level[edge.to] == -1) {
                level[edge.to] = level[v] + 1;
                q.push(edge.to);
            }
        }
    }
    return level[t] != -1;
}

long long dfs(int v, int t, long long pushed) {
    if (pushed == 0 || v == t) return pushed;
    for (int& cid = ptr[v]; cid < (int)adj[v].size(); ++cid) {
        auto& edge = adj[v][cid];
        int trg = edge.to;
        if (level[v] + 1 != level[trg] || edge.cap - edge.flow <= 0) continue;
        long long tr = dfs(trg, t, min(pushed, edge.cap - edge.flow));
        if (tr == 0) continue;
        edge.flow += tr;
        adj[trg][edge.rev].flow -= tr;
        return tr;
    }
    return 0;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n, m;
    if (!(cin >> n >> m)) return 0;
    adj.assign(n + 1, vector<Edge>());
    level.assign(n + 1, 0);
    ptr.assign(n + 1, 0);
    
    for (int i = 0; i < m; i++) {
        int u, v;
        long long c;
        cin >> u >> v >> c;
        adj[u].push_back({v, c, 0, (int)adj[v].size()});
        adj[v].push_back({u, 0, 0, (int)adj[u].size() - 1});
    }
    
    long long flow = 0;
    while (bfs(1, n)) {
        fill(ptr.begin(), ptr.end(), 0);
        while (long long pushed = dfs(1, n, INF)) {
            flow += pushed;
        }
    }
    cout << flow << "\\n";
    return 0;
}
`,
        java: `import java.util.*;
import java.io.*;

public class Main {
    static class Edge {
        int to, rev;
        long cap, flow;
        Edge(int to, long cap, int rev) {
            this.to = to;
            this.cap = cap;
            this.rev = rev;
        }
    }
    
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        StringTokenizer st = new StringTokenizer(line);
        int n = Integer.parseInt(st.nextToken());
        int m = Integer.parseInt(st.nextToken());
        List<List<Edge>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            while (st == null || !st.hasMoreTokens()) {
                String l = br.readLine();
                if (l == null) break;
                st = new StringTokenizer(l);
            }
            int u = Integer.parseInt(st.nextToken());
            int v = Integer.parseInt(st.nextToken());
            long c = Long.parseLong(st.nextToken());
            adj.get(u).add(new Edge(v, c, adj.get(v).size()));
            adj.get(v).add(new Edge(u, 0, adj.get(u).size() - 1));
        }
        
        long maxFlow = 0;
        int s = 1, t = n;
        while (true) {
            int[] parentEdge = new int[n + 1];
            int[] parentNode = new int[n + 1];
            Arrays.fill(parentNode, -1);
            Queue<Integer> q = new LinkedList<>();
            q.add(s);
            parentNode[s] = s;
            while (!q.isEmpty()) {
                int cur = q.poll();
                if (cur == t) break;
                List<Edge> edges = adj.get(cur);
                for (int i = 0; i < edges.size(); i++) {
                    Edge e = edges.get(i);
                    if (parentNode[e.to] == -1 && e.cap - e.flow > 0) {
                        parentNode[e.to] = cur;
                        parentEdge[e.to] = i;
                        q.add(e.to);
                    }
                }
            }
            if (parentNode[t] == -1) break;
            long push = Long.MAX_VALUE;
            for (int v = t; v != s; v = parentNode[v]) {
                int u = parentNode[v];
                int eIdx = parentEdge[v];
                Edge e = adj.get(u).get(eIdx);
                push = Math.min(push, e.cap - e.flow);
            }
            for (int v = t; v != s; v = parentNode[v]) {
                int u = parentNode[v];
                int eIdx = parentEdge[v];
                Edge e = adj.get(u).get(eIdx);
                e.flow += push;
                adj.get(v).get(e.rev).flow -= push;
            }
            maxFlow += push;
        }
        System.out.println(maxFlow);
    }
}
`,
        r: `# Solution in R
stdin_lines <- readLines(file("stdin"), warn = FALSE)
cat("0\\n")
`,
      },
      examples: [
        {
          input: '4 5\\n1 2 3\\n1 3 2\\n2 3 1\\n2 4 2\\n3 4 3',
          output: '5',
          explanation: 'Flow of 2 along 1->2->4, 1 along 1->2->3->4, and 2 along 1->3->4 gives total maximum flow 5.',
        },
        {
          input: '3 1\\n1 2 10',
          output: '0',
          explanation: 'Substation 3 is disconnected from substation 1, so maximum flow is 0.',
        },
      ],
      hiddenTestCases: [
        { id: 'tc3_1', input: '4 5\\n1 2 3\\n1 3 2\\n2 3 1\\n2 4 2\\n3 4 3', expectedOutput: '5' },
        { id: 'tc3_2', input: '3 2\\n1 2 10\\n2 3 5', expectedOutput: '5' },
        { id: 'tc3_3', input: '3 1\\n1 2 10', expectedOutput: '0' },
        { id: 'tc3_4', input: '5 7\\n1 2 10\\n1 3 5\\n2 3 15\\n2 4 9\\n3 4 4\\n3 5 8\\n4 5 10', expectedOutput: '14' },
        { id: 'tc3_5', input: '2 1\\n1 2 100', expectedOutput: '100' },
      ],
      judgeUrl: 'https://vjudge.net/contest',
    },
  ],
};

export const INITIAL_CODEBID_SETTINGS: CodeBidSettings = {
  status: 'LOCKED',
  auctionState: 'idle',
  currentRiddleIndex: 0,
  bidIncrement: 10,
  startingCoins: 100,
  isTieBreaker: false,
  qualifiedTeamIds: ['T01', 'T02'],
};

export const INITIAL_LEADERBOARD_SETTINGS: LeaderboardSettings = {
  isVisibleToParticipants: true,
  isFrozen: false,
};

// Exactly 25 Curated Computer Science Quiz Questions (2 pts each)
export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'What is the tight worst-case time complexity of searching in a Balanced Binary Search Tree (AVL or Red-Black)?',
    options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 2,
    question: 'Which CPU scheduling algorithm is inherently preemptive and optimal for minimizing average waiting time?',
    options: ['Shortest Remaining Time First (SRTF)', 'First-Come First-Served (FCFS)', 'Round Robin (RR)', 'Priority Scheduling without preemption'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 3,
    question: 'Which of the following database isolation levels prevents dirty reads, non-repeatable reads, and phantom reads?',
    options: ['Serializable', 'Read Committed', 'Repeatable Read', 'Read Uncommitted'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 4,
    question: 'In computer networking, which protocol operates at the Transport layer and provides connectionless, unreliable datagram delivery?',
    options: ['UDP', 'TCP', 'IP', 'ICMP'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 5,
    question: 'What data structure is typically used to implement Breadth-First Search (BFS) on an unweighted graph?',
    options: ['Queue', 'Stack', 'Priority Queue', 'Disjoint Set Union'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 6,
    question: 'What is the maximum number of nodes at level L in a binary tree, where root is at level 0?',
    options: ['2^L', '2^(L+1)', '2^L - 1', 'L^2'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 7,
    question: 'In C/C++, which memory segment stores dynamically allocated variables (via malloc or new)?',
    options: ['Heap', 'Stack', 'Data segment', 'Code segment'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 8,
    question: 'What is the purpose of the virtual memory page table?',
    options: ['To map virtual addresses to physical frame addresses', 'To store CPU instruction registers', 'To schedule ready processes', 'To detect deadlock conditions'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 9,
    question: 'Which algorithmic paradigm does Floyd-Warshall all-pairs shortest path algorithm employ?',
    options: ['Dynamic Programming', 'Greedy Method', 'Divide and Conquer', 'Branch and Bound'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 10,
    question: 'What is the time complexity to build a binary max-heap from an unsorted array of N elements?',
    options: ['O(N)', 'O(N log N)', 'O(N^2)', 'O(log N)'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 11,
    question: 'Which condition is NOT one of Coffman’s four necessary conditions for deadlock in operating systems?',
    options: ['Process Preemption', 'Mutual Exclusion', 'Hold and Wait', 'Circular Wait'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 12,
    question: 'In TCP congestion control, what happens immediately after a packet loss is detected via 3 duplicate ACKs in TCP Reno?',
    options: ['Fast Retransmit & Fast Recovery (CWND halved)', 'CWND drops to 1 MSS', 'Connection terminates', 'SSThresh doubles'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 13,
    question: 'Which normal form eliminates partial dependency of non-prime attributes on a candidate key?',
    options: ['Second Normal Form (2NF)', 'First Normal Form (1NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 14,
    question: 'What is the time complexity of the Disjoint Set Union (DSU) Find operation with Path Compression and Union by Rank?',
    options: ['O(α(N)) - Inverse Ackermann', 'O(1) strictly', 'O(log N)', 'O(N)'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 15,
    question: 'Which addressing mode specifies the operand directly within the instruction opcode itself?',
    options: ['Immediate Addressing', 'Register Indirect', 'Direct Addressing', 'Indexed Addressing'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 16,
    question: 'What does ACID stand for in the context of database transaction management?',
    options: ['Atomicity, Consistency, Isolation, Durability', 'Accuracy, Concurrency, Integrity, Data', 'Atomicity, Compatibility, Indexing, Delivery', 'Allocation, Coordination, Isolation, Distribution'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 17,
    question: 'In Git, which command creates a new commit by inverting the changes introduced in an earlier commit?',
    options: ['git revert', 'git reset', 'git checkout', 'git rebase'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 18,
    question: 'Which sorting algorithm is guaranteed to be stable and has worst-case O(N log N) runtime?',
    options: ['Merge Sort', 'Quick Sort', 'Heap Sort', 'Selection Sort'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 19,
    question: 'What is the default port number used by the HTTPS protocol?',
    options: ['443', '80', '8080', '22'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 20,
    question: 'Which technique is used to solve hash table collisions without allocating outside linked list memory nodes?',
    options: ['Open Addressing (Linear Probing)', 'Chaining with Linked Lists', 'Double Hashing with Overflow Buckets', 'Bloom Filter'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 21,
    question: 'In object-oriented programming, which principle states that child classes should be replaceable by their base types without altering program correctness?',
    options: ['Liskov Substitution Principle', 'Single Responsibility Principle', 'Open-Closed Principle', 'Interface Segregation Principle'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 22,
    question: 'What is the primary function of the Translation Lookaside Buffer (TLB)?',
    options: ['Hardware cache for virtual-to-physical address translations', 'Cache for CPU micro-operations', 'Stack frame pointer register', 'Branch prediction table'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 23,
    question: 'Which algorithm finds the Minimum Spanning Tree of a connected weighted graph by picking the minimum-weight edge that connects any two trees?',
    options: ["Kruskal's Algorithm", "Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Kosaraju's Algorithm"],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 24,
    question: 'What is the result of evaluating: (x & (x - 1)) == 0 for a positive integer x in two’s complement representation?',
    options: ['Checks if x is a power of 2', 'Checks if x is an odd number', 'Multiplies x by 2', 'Clears the lowest significant bit of x'],
    correctIndex: 0,
    points: 2,
  },
  {
    id: 25,
    question: 'Which system call in POSIX Unix systems is invoked by a parent process to create an exact duplicate child process?',
    options: ['fork()', 'exec()', 'clone()', 'pthread_create()'],
    correctIndex: 0,
    points: 2,
  },
];

// Exactly 6 Coding Riddles for CodeBid Round
export const MOCK_CODEBID_RIDDLES: CodeBidRiddle[] = [
  {
    id: 'RID-1',
    riddleNumber: 1,
    title: 'The Invariant Inversion',
    startingBid: 20,
    currentBid: 20,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    bountyPoints: 50,
    riddleText: `I bubble up when smallest, or sink when heavy weighed.
Yet in this corrupted tree array, one lonely swap was strayed.
My root is ten, my leaves are true, but index 3 holds forty-two,
Whose parent index one holds fifty-five!
Name the fundamental heap property that has been shattered.`,
    solutionAnswer: 'Min-Heap Invariant',
    maxSolvingTimeSeconds: 60,
    status: 'pending',
    currentSolvingTeamId: null,
    attemptedTeamIds: [],
    bidsHistory: [],
  },
  {
    id: 'RID-2',
    riddleNumber: 2,
    title: 'The Circular Standoff',
    startingBid: 30,
    currentBid: 30,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    bountyPoints: 60,
    riddleText: `Two philosophers dine at midnight, each clutching one silver fork.
One waits for the left to drop, while the other halts all work.
Neither yields, neither eats, mutex locks the thread.
Name Coffman’s fourth deadly condition that leaves all workers dead!`,
    solutionAnswer: 'Circular Wait',
    maxSolvingTimeSeconds: 60,
    status: 'pending',
    currentSolvingTeamId: null,
    attemptedTeamIds: [],
    bidsHistory: [],
  },
  {
    id: 'RID-3',
    riddleNumber: 3,
    title: 'The Phantom Inversion',
    startingBid: 35,
    currentBid: 35,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    bountyPoints: 70,
    riddleText: `A low-priority worker locks the gate, a high-priority task arrives to claim.
Yet a medium task preempts the first, stealing the CPU without shame!
Mars Pathfinder froze in deep space cold until the remedy took hold.
What is the name of this synchronization flaw?`,
    solutionAnswer: 'Priority Inversion',
    maxSolvingTimeSeconds: 60,
    status: 'pending',
    currentSolvingTeamId: null,
    attemptedTeamIds: [],
    bidsHistory: [],
  },
  {
    id: 'RID-4',
    riddleNumber: 4,
    title: 'The Bitwise Chameleon',
    startingBid: 40,
    currentBid: 40,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    bountyPoints: 80,
    riddleText: `I take two numbers in my grasp and flip the differing bits with care.
Applied once I encrypt your secret; applied twice I lay it bare!
I satisfy self-inverse truth: A ⊕ B ⊕ B = A.
What arithmetic or logic gate holds this cryptographic sway?`,
    solutionAnswer: 'XOR',
    maxSolvingTimeSeconds: 60,
    status: 'pending',
    currentSolvingTeamId: null,
    attemptedTeamIds: [],
    bidsHistory: [],
  },
  {
    id: 'RID-5',
    riddleNumber: 5,
    title: 'The Ghost in the Cache',
    startingBid: 45,
    currentBid: 45,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    bountyPoints: 90,
    riddleText: `I know the future perfectly, every memory page in sight.
I evict the page whose next request is farthest in the night.
No online algorithm can beat my theoretical boundary.
What is the name of Bélády’s optimal replacement algorithm?`,
    solutionAnswer: 'Belady Optimal Algorithm',
    maxSolvingTimeSeconds: 60,
    status: 'pending',
    currentSolvingTeamId: null,
    attemptedTeamIds: [],
    bidsHistory: [],
  },
  {
    id: 'RID-6',
    riddleNumber: 6,
    title: 'The Byzantine General Threshold',
    startingBid: 50,
    currentBid: 50,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    bountyPoints: 100,
    riddleText: `In a network of twenty-one generals, traitors whisper lies in the night.
To march at dawn and reach consensus, honest nodes must unite.
Under Lamport’s formula N ≥ 3m + 1, what is the exact maximum count of traitor nodes
that this system of 21 nodes can tolerate?`,
    solutionAnswer: '6',
    maxSolvingTimeSeconds: 60,
    status: 'pending',
    currentSolvingTeamId: null,
    attemptedTeamIds: [],
    bidsHistory: [],
  },
];

// Tie-Breaker Riddle (Used only if 2 or more teams tie for 1st place after 6 riddles)
export const TIE_BREAKER_RIDDLE: CodeBidRiddle = {
  id: 'RID-TIE',
  riddleNumber: 7,
  title: 'Championship Tie-Breaker Enigma',
  startingBid: 50,
  currentBid: 50,
  highestBidderTeamId: null,
  highestBidderTeamName: null,
  bountyPoints: 120,
  riddleText: `I am the bridge between P and NP, the archetype Cook and Levin gave.
If you find a polynomial solver for my boolean clauses, all Millennium problems you save!
What foundational decision problem am I?`,
  solutionAnswer: 'Boolean Satisfiability (SAT)',
  maxSolvingTimeSeconds: 90,
  status: 'pending',
  currentSolvingTeamId: null,
  attemptedTeamIds: [],
  bidsHistory: [],
};

export const DEFAULT_MONITORING_SETTINGS: MonitoringViolationSettings = {
  requireCamera: true,
  requireFullscreen: true,
  monitorTabSwitching: true,
  monitorWindowFocus: true,
  maxWarningsBeforeSuspension: 3,
  maxViolationsBeforeReview: 5,
  autoDisqualification: false,
};
