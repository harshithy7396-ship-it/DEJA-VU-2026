import React, { useState, useRef, useMemo } from 'react';
import { useCompetition } from '../context/CompetitionContext';
import {
  Users,
  Key,
  Upload,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  RefreshCw,
  Search,
  Filter,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { Team } from '../types/competition';

export interface ParsedTeamPreview {
  rowIndex: number;
  rawLine: string;
  teamNumber: number;
  name: string;
  id: string;
  password: string;
  members: string[];
  department: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AdminTeamsProps {
  onNavigate?: (page: string) => void;
}

/**
 * Robust CSV line tokenizer that handles quotes, escaped quotes, and commas
 */
export function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      // Escaped quote e.g. ""
      if (inQuotes && line[i + 1] === char) {
        cur += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  parts.push(cur.trim());
  return parts;
}

/**
 * Parses raw CSV content following the schema:
 * Number, Name, ID, Password, Members, Department
 */
export function parseAndValidateTeamsCsv(
  csvContent: string,
  existingTeams: Team[]
): {
  parsedRows: ParsedTeamPreview[];
  validCount: number;
  errorCount: number;
  globalError?: string;
} {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { parsedRows: [], validCount: 0, errorCount: 0, globalError: 'CSV file is empty.' };
  }

  // Detect and skip header row if present
  const firstRowParts = parseCsvLine(lines[0]);
  const firstColLower = (firstRowParts[0] || '').toLowerCase();
  const secondColLower = (firstRowParts[1] || '').toLowerCase();
  const thirdColLower = (firstRowParts[2] || '').toLowerCase();

  const isHeader =
    isNaN(Number(firstRowParts[0])) ||
    firstColLower.includes('number') ||
    firstColLower.includes('slot') ||
    firstColLower.includes('team') ||
    secondColLower.includes('name') ||
    thirdColLower.includes('id');

  const dataStartIndex = isHeader ? 1 : 0;
  const dataLines = lines.slice(dataStartIndex);

  if (dataLines.length === 0) {
    return { parsedRows: [], validCount: 0, errorCount: 0, globalError: 'No data rows found in CSV.' };
  }

  const parsedRows: ParsedTeamPreview[] = [];
  const seenTeamNumbers = new Map<number, number>(); // teamNumber -> rowIndex
  const seenTeamIds = new Map<string, number>(); // teamId.toUpperCase() -> rowIndex

  dataLines.forEach((line, index) => {
    const rowIndex = dataStartIndex + index + 1; // 1-indexed line in raw text
    const cols = parseCsvLine(line);

    const rawNum = cols[0] || '';
    const rawName = cols[1] || '';
    const rawId = cols[2] || '';
    const rawPassword = cols[3] || '';
    const rawMembers = cols[4] || '';
    const rawDepartment = cols[5] || '';

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Team Number Validation
    let teamNumber = parseInt(rawNum, 10);
    if (!rawNum || isNaN(teamNumber)) {
      errors.push('Missing or invalid Team Number (must be integer 1-25)');
      teamNumber = index + 1; // fallback for display
    } else if (teamNumber < 1 || teamNumber > 25) {
      errors.push(`Team Number ${teamNumber} is out of bounds (allowed: 1-25)`);
    } else if (seenTeamNumbers.has(teamNumber)) {
      errors.push(`Duplicate Team Number #${teamNumber} (already used on row ${seenTeamNumbers.get(teamNumber)})`);
    } else {
      seenTeamNumbers.set(teamNumber, rowIndex);
    }

    // 2. Team Name Validation
    const name = rawName.trim();
    if (!name) {
      errors.push('Team Name is required');
    }

    // 3. Team ID Validation
    const teamId = rawId.trim();
    if (!teamId) {
      errors.push('Team ID is required');
    } else {
      const upperId = teamId.toUpperCase();
      if (seenTeamIds.has(upperId)) {
        errors.push(`Duplicate Team ID "${teamId}" in CSV (already defined on row ${seenTeamIds.get(upperId)})`);
      } else {
        seenTeamIds.set(upperId, rowIndex);

        // Check conflicts with existing teams in state not being overwritten by this import
        const conflict = existingTeams.find(
          (t) => t.teamNumber !== teamNumber && t.id.toUpperCase() === upperId
        );
        if (conflict) {
          errors.push(`Team ID "${teamId}" is already assigned to Team #${conflict.teamNumber} in competition state`);
        }
      }
    }

    // 4. Password Validation
    const password = rawPassword.trim();
    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 4) {
      warnings.push('Password is short (recommended: at least 4 characters)');
    }

    // 5. Members Parsing
    const members = rawMembers
      ? rawMembers
          .split(/[,;]/)
          .map((m) => m.trim())
          .filter(Boolean)
      : [];

    if (members.length === 0) {
      warnings.push('No team members specified (can be added later)');
    }

    // 6. Department
    const department = rawDepartment.trim();

    const isValid = errors.length === 0;

    parsedRows.push({
      rowIndex,
      rawLine: line,
      teamNumber,
      name,
      id: teamId || `T${String(teamNumber).padStart(2, '0')}`,
      password: password || 'defaultpass',
      members,
      department,
      isValid,
      errors,
      warnings,
    });
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return {
    parsedRows,
    validCount,
    errorCount,
  };
}

export const AdminTeams: React.FC<AdminTeamsProps> = () => {
  const {
    teams,
    updateTeam,
    registerTeamSlot,
    deleteTeamSlot,
    toggleTeamStatus,
    generateTeamCredentials,
    exportTeamsToCsv,
    resetQuizSession,
  } = useCompetition();

  // Search and Filter State for Main Table
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Eliminated' | 'Registered' | 'Empty'>('ALL');

  // Single Slot Edit Modal State
  const [editingTeamNumber, setEditingTeamNumber] = useState<number | null>(null);
  const [editCustomId, setEditCustomId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editMembers, setEditMembers] = useState('');
  const [editPasscode, setEditPasscode] = useState('');
  const [editFormError, setEditFormError] = useState('');

  // CSV Import & Validation Preview Modal State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvStep, setCsvStep] = useState<'input' | 'preview'>('input');
  const [csvContent, setCsvContent] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedTeamPreview[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const [showPasswordsInPreview, setShowPasswordsInPreview] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered Main Teams Table
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchesSearch =
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.members.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(t.teamNumber).includes(searchTerm);

      if (!matchesSearch) return false;

      if (statusFilter === 'Active') return t.status === 'Active';
      if (statusFilter === 'Eliminated') return t.status === 'Eliminated';
      if (statusFilter === 'Registered') return t.registrationStatus === 'Registered' || t.name.trim().length > 0;
      if (statusFilter === 'Empty') return t.registrationStatus !== 'Registered' && t.name.trim().length === 0;
      return true;
    });
  }, [teams, searchTerm, statusFilter]);

  // Handle Opening Single Team Slot Modal
  const startEditTeam = (team: Team) => {
    setEditingTeamNumber(team.teamNumber);
    setEditCustomId(team.id);
    setEditName(team.name);
    setEditDepartment(team.department || '');
    setEditMembers(team.members.join(', '));
    setEditPasscode(team.passcode);
    setEditFormError('');
  };

  const handleGenerateCredentialsForSlot = () => {
    if (!editingTeamNumber) return;
    const creds = generateTeamCredentials(editingTeamNumber);
    setEditCustomId(creds.teamId);
    setEditPasscode(creds.passcode);
  };

  const saveEditTeam = () => {
    if (!editingTeamNumber) return;
    const membersArr = editMembers
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = registerTeamSlot(
      editingTeamNumber,
      editName,
      membersArr,
      editPasscode,
      editDepartment,
      editCustomId
    );

    if (!res.success) {
      setEditFormError(res.error || 'Failed to save team slot.');
      return;
    }
    setEditingTeamNumber(null);
  };

  const handleBatchGenerateCredentials = () => {
    if (!window.confirm('Generate fresh credentials for all 25 team slots?')) return;
    teams.forEach((t) => {
      const creds = generateTeamCredentials(t.teamNumber);
      updateTeam(t.id, {
        id: creds.teamId,
        passcode: creds.passcode,
      });
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    const csvData = exportTeamsToCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dejavu_teams_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setImportStatusMessage(null);
    };
    reader.readAsText(file);
  };

  // Sample CSV Loader
  const handleLoadSampleCsv = () => {
    const sample = `Number,Name,ID,Password,Members,Department
1,Byte Force,CT01,DV@Byte26,Aarav Patel;Sneha Rao,CSE
2,Algorithm Aces,CT02,DV@Algo26,Vikram Reddy;Priya Nair,IT
3,Cyber Sentinels,CT03,DV@Cyber26,Karthik Sharma;Ananya Sen,ECE
4,Data Dragons,CT04,DV@Data26,Rohan Gupta;Tanvi Joshi,AI&DS
5,Quantum Coders,CT05,DV@Quantum26,Siddharth Verma;Meera Das,CSE`;
    setCsvContent(sample);
    setImportStatusMessage(null);
  };

  // Trigger Parsing and Transition to Preview
  const handleParseCsvForPreview = () => {
    setImportStatusMessage(null);
    if (!csvContent.trim()) {
      setImportStatusMessage({
        type: 'error',
        text: 'Please paste CSV content or upload a CSV file before previewing.',
      });
      return;
    }

    const result = parseAndValidateTeamsCsv(csvContent, teams);
    if (result.globalError) {
      setImportStatusMessage({
        type: 'error',
        text: result.globalError,
      });
      return;
    }

    setParsedPreview(result.parsedRows);
    setPreviewFilter('ALL');
    setCsvStep('preview');
  };

  // Mass-Add / Commit Valid Previewed Teams to State
  const handleCommitPreviewedTeams = (importOnlyValid: boolean = false) => {
    const rowsToImport = importOnlyValid
      ? parsedPreview.filter((r) => r.isValid)
      : parsedPreview;

    if (rowsToImport.length === 0) {
      setImportStatusMessage({
        type: 'error',
        text: 'No valid rows available to import.',
      });
      return;
    }

    if (!importOnlyValid && parsedPreview.some((r) => !r.isValid)) {
      setImportStatusMessage({
        type: 'error',
        text: 'Please resolve errors or choose "Import Only Valid Teams".',
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    rowsToImport.forEach((row) => {
      const res = registerTeamSlot(
        row.teamNumber,
        row.name,
        row.members,
        row.password,
        row.department,
        row.id
      );
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    setImportStatusMessage({
      type: 'success',
      text: `Successfully mass-added ${successCount} team${successCount === 1 ? '' : 's'} to contest state!${
        failCount > 0 ? ` (${failCount} failed)` : ''
      }`,
    });

    setTimeout(() => {
      setShowCsvModal(false);
      setCsvStep('input');
      setCsvContent('');
      setParsedPreview([]);
      setImportStatusMessage(null);
    }, 1400);
  };

  // Filtered Preview Rows
  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'VALID') return parsedPreview.filter((r) => r.isValid);
    if (previewFilter === 'ERRORS') return parsedPreview.filter((r) => !r.isValid);
    return parsedPreview;
  }, [parsedPreview, previewFilter]);

  const previewValidCount = useMemo(() => parsedPreview.filter((r) => r.isValid).length, [parsedPreview]);
  const previewErrorCount = useMemo(() => parsedPreview.filter((r) => !r.isValid).length, [parsedPreview]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Team Allocation & Authentication
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="text-[10px] font-bold text-neutral-500 uppercase">
                {teams.filter((t) => t.registrationStatus === 'Registered' || t.name.trim().length > 0).length} / 25
                Registered
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-950 dark:text-white">
              Contest Teams Management
            </h3>
            <p className="text-xs text-neutral-500">
              Manage all 25 team slots. Import CSV with pre-validation preview, customize Team IDs, and export credentials.
            </p>
          </div>

          {/* Action Buttons: Batch Generate, Import CSV, Export CSV */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchGenerateCredentials}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Generate fresh IDs and passwords for all slots"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>Batch Generate IDs</span>
            </button>
            <button
              onClick={() => {
                setShowCsvModal(true);
                setCsvStep('input');
                setImportStatusMessage(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV (Preview & Validate)</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by team name, custom ID, member, or slot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            {(['ALL', 'Registered', 'Empty', 'Active', 'Eliminated'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  statusFilter === filterKey
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800/60'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>
        </div>

        {/* 25 Teams Master Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase">
              <tr>
                <th className="py-3 px-3">Slot #</th>
                <th className="py-3 px-3">Team ID</th>
                <th className="py-3 px-3">Team Name</th>
                <th className="py-3 px-3">Dept/Branch</th>
                <th className="py-3 px-3">Members</th>
                <th className="py-3 px-3">Password</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredTeams.map((t) => (
                <tr key={t.teamNumber} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                  <td className="py-3 px-3 font-mono font-bold text-neutral-900 dark:text-white">
                    #{String(t.teamNumber).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {t.id}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-neutral-950 dark:text-neutral-100">
                      {t.name || <em className="text-neutral-400 font-normal">Unassigned Slot</em>}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-neutral-500">
                    {t.department || '—'}
                  </td>
                  <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400 max-w-[200px] truncate">
                    {t.members.length > 0 ? (
                      <span title={t.members.join(', ')}>{t.members.join(', ')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-neutral-500">
                    {t.passcode}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-neutral-900 dark:text-white">
                    {t.totalScore}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => startEditTeam(t)}
                      className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-amber-500 font-semibold transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleTeamStatus(t.id)}
                      className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      {t.status === 'Active' ? 'Eliminate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => resetQuizSession(t.id)}
                      title="Reset quiz session for this team"
                      className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-amber-500 transition cursor-pointer text-[11px]"
                    >
                      Reset Q
                    </button>
                    <button
                      onClick={() => deleteTeamSlot(t.id)}
                      title="Clear registration details for this slot"
                      className="px-2 py-1 rounded text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CSV IMPORT & VALIDATION PREVIEW MODAL                     */}
      {/* ========================================================= */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                    CSV Team Batch Importer
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Expected schema: <code>Number, Name, ID, Password, Members, Department</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      csvStep === 'input'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    1. Input CSV
                  </span>
                  <span className="text-neutral-400">→</span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      csvStep === 'preview'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    2. Preview & Validate
                  </span>
                </div>

                <button
                  onClick={() => setShowCsvModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Status notification banner if any */}
            {importStatusMessage && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 shrink-0 ${
                  importStatusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                }`}
              >
                {importStatusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                )}
                <span>{importStatusMessage.text}</span>
              </div>
            )}

            {/* STEP 1: INPUT CSV */}
            {csvStep === 'input' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Format Guidance & Quick Load */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white block mb-0.5">
                      Standard CSV Column Order:
                    </span>
                    <code className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                      Number, Name, ID, Password, Members, Department
                    </code>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Header row is optional. Members can be separated by semicolons (;) or commas inside quotes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadSampleCsv}
                    className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:border-amber-500 hover:text-amber-600 transition cursor-pointer shrink-0"
                  >
                    Load Sample Template
                  </button>
                </div>

                {/* File Upload Box */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-amber-500 dark:hover:border-amber-500 text-xs font-semibold text-neutral-600 dark:text-neutral-400 transition cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <FileText className="w-5 h-5 text-amber-500" />
                    <span>Upload .csv file from your computer</span>
                    <span className="text-[10px] text-neutral-400">Click to browse or drag and drop</span>
                  </button>
                </div>

                {/* Raw CSV Textarea */}
                <div>
                  <label className="block font-bold text-xs text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Or Paste CSV Data Directly:
                  </label>
                  <textarea
                    rows={8}
                    value={csvContent}
                    onChange={(e) => {
                      setCsvContent(e.target.value);
                      setImportStatusMessage(null);
                    }}
                    placeholder={`Number,Name,ID,Password,Members,Department\n1,Cyber Knights,CT01,DV@2026,Alice Sharma;Bob Rao,CSE\n2,Code Ninjas,CT02,DV@2026,Clara V;David Lee,IT`}
                    className="w-full p-3.5 rounded-2xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: PREVIEW & VALIDATION */}
            {csvStep === 'preview' && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Metrics & Filter Bar */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Parsed: {parsedPreview.length} Rows
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">•</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {previewValidCount} Valid
                    </span>
                    {previewErrorCount > 0 && (
                      <>
                        <span className="text-neutral-300 dark:text-neutral-700">•</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {previewErrorCount} With Errors
                        </span>
                      </>
                    )}
                  </div>

                  {/* Filter tabs and password toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordsInPreview((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-amber-500 transition cursor-pointer flex items-center gap-1"
                    >
                      {showPasswordsInPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPasswordsInPreview ? 'Mask Passwords' : 'Show Passwords'}</span>
                    </button>

                    <div className="flex rounded-lg bg-neutral-200 dark:bg-neutral-800 p-0.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          previewFilter === 'ALL'
                            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        All ({parsedPreview.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('VALID')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          previewFilter === 'VALID'
                            ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        Valid ({previewValidCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('ERRORS')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          previewFilter === 'ERRORS'
                            ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        Errors ({previewErrorCount})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Validation Preview Table */}
                <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Slot #</th>
                        <th className="py-2.5 px-3">Team ID</th>
                        <th className="py-2.5 px-3">Team Name</th>
                        <th className="py-2.5 px-3">Password</th>
                        <th className="py-2.5 px-3">Dept</th>
                        <th className="py-2.5 px-3">Members</th>
                        <th className="py-2.5 px-3">Validation Diagnostics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-normal">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-neutral-400">
                            No rows matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.map((row) => (
                          <tr
                            key={row.rowIndex}
                            className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 ${
                              !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  Invalid
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 dark:text-white">
                              #{String(row.teamNumber).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {row.id}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-white max-w-[140px] truncate">
                              {row.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-neutral-500">
                              {showPasswordsInPreview
                                ? row.password
                                : '•'.repeat(Math.min(row.password.length, 8))}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">
                              {row.department || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400 max-w-[160px] truncate">
                              {row.members.length > 0 ? row.members.join(', ') : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.errors.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.errors.map((err, eIdx) => (
                                    <div key={eIdx} className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : row.warnings.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.warnings.map((warn, wIdx) => (
                                    <div key={wIdx} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <Info className="w-3 h-3 shrink-0" />
                                      <span>{warn}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  All checks passed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0 mt-3">
              {csvStep === 'input' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCsvModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-semibold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleParseCsvForPreview}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer transition shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <span>Parse & Preview Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCsvStep('input')}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-semibold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to CSV Editor</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {previewErrorCount > 0 && previewValidCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCommitPreviewedTeams(true)}
                        className="px-4 py-2.5 rounded-xl border border-emerald-500 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition"
                      >
                        Import Only Valid ({previewValidCount}) Teams
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={previewValidCount === 0 || previewErrorCount > 0}
                      onClick={() => handleCommitPreviewedTeams(false)}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 text-xs font-bold cursor-pointer transition shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Mass-Add ({previewValidCount}) Teams to State</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SINGLE TEAM SLOT EDIT MODAL                               */}
      {/* ========================================================= */}
      {editingTeamNumber !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                Edit Team Slot #{editingTeamNumber}
              </h3>
              <button
                onClick={() => setEditingTeamNumber(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFormError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editFormError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Team ID (Custom)
                  </label>
                  <input
                    type="text"
                    value={editCustomId}
                    onChange={(e) => setEditCustomId(e.target.value.toUpperCase())}
                    placeholder="e.g. CT2026, T01"
                    className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Department / Branch
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    placeholder="e.g. CSE / IT / ECE"
                    className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Code Gladiators"
                  className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Team Members (comma or semicolon separated)
                </label>
                <input
                  type="text"
                  value={editMembers}
                  onChange={(e) => setEditMembers(e.target.value)}
                  placeholder="e.g. Alice Sharma, Bob Rao, Clara V"
                  className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateCredentialsForSlot}
                    className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate ID & Pass
                  </button>
                </div>
                <input
                  type="text"
                  value={editPasscode}
                  onChange={(e) => setEditPasscode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setEditingTeamNumber(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveEditTeam}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer transition shadow-md shadow-amber-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
