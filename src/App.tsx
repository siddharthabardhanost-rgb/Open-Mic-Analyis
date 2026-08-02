import { FileText, Download, Play, Users, Link as LinkIcon, CheckCircle2, Copy, Check, MessageSquare, Send, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { FileDropzone } from "./components/FileDropzone";
import { parseAttendanceCsv } from "./services/csvParser";
import { analyzeTranscriptsAndChats, askQuestionAboutSession } from "./services/geminiService";
import { generateDocx } from "./services/docxService";
import { cn } from "./lib/utils";

interface QnA {
  question: string;
  answer: string;
}

export default function App() {
  const [vttFiles, setVttFiles] = useState<File[]>([]);
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summary, setSummary] = useState("");
  const [qnaList, setQnaList] = useState<QnA[]>([]);
  const [linksList, setLinksList] = useState<string[]>([]);
  const [hostMessagesList, setHostMessagesList] = useState<{sender: string; message: string}[]>([]);
  const [error, setError] = useState("");

  const [customQuestion, setCustomQuestion] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState("");

  const [copiedQnA, setCopiedQnA] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState(false);
  const [copiedHostMessages, setCopiedHostMessages] = useState(false);

  const handleCopyQnA = () => {
    const text = qnaList.map((item, i) => `Q${i + 1}: ${item.question}\nA: ${item.answer}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedQnA(true);
    setTimeout(() => setCopiedQnA(false), 2000);
  };

  const handleCopyLinks = () => {
    const text = linksList.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLinks(true);
    setTimeout(() => setCopiedLinks(false), 2000);
  };

  const handleCopyHostMessages = () => {
    const text = hostMessagesList.map(msg => `${msg.sender}:\n${msg.message}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedHostMessages(true);
    setTimeout(() => setCopiedHostMessages(false), 2000);
  };

  const [loadingStatus, setLoadingStatus] = useState("Analyzing...");

  const handleCsvAdded = async (files: File[]) => {
    setCsvFiles(files);
    if (files.length > 0) {
      try {
        const data = await parseAttendanceCsv(files[0]);
        setAttendanceData(data);
      } catch(e) {
        console.error("Error parsing CSV", e);
      }
    } else {
      setAttendanceData([]);
    }
  };

  const analytics = useMemo(() => {
    if (attendanceData.length === 0) return null;
    let totalDuration = 0;
    let attendeesWithDuration = 0;
    
    attendanceData.forEach(row => {
      // Find duration key (case-insensitive)
      let durationStr = 
        row['Duration (Minutes)'] || 
        row['Duration'] || 
        row['Time in Session (minutes)'] ||
        row['Time in Session'];
        
      if (!durationStr) {
        const key = Object.keys(row).find(k => k.toLowerCase().includes('duration') || k.toLowerCase().includes('time in session'));
        if (key) {
          durationStr = row[key];
        }
      }
      
      let duration = parseInt(durationStr) || 0;
      if (duration > 0) {
        totalDuration += duration;
        attendeesWithDuration++;
      }
    });

    return {
      totalAttendees: attendanceData.length,
      averageDuration: attendeesWithDuration > 0 ? Math.round(totalDuration / attendeesWithDuration) : 0,
    };
  }, [attendanceData]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError("");

    const statuses = [
      "Reading transcripts & chats...",
      "Extracting Questions & Answers...",
      "Identifying shared links...",
      "Generating session summary...",
      "Finalizing analysis..."
    ];
    let statusIndex = 0;
    setLoadingStatus(statuses[0]);

    const intervalId = setInterval(() => {
      statusIndex = Math.min(statusIndex + 1, statuses.length - 1);
      setLoadingStatus(statuses[statusIndex]);
    }, 4000);

    try {
      const vttTexts = await Promise.all(vttFiles.map(f => f.text()));
      const chatTexts = await Promise.all(chatFiles.map(f => f.text()));
      
      const result = await analyzeTranscriptsAndChats(vttTexts, chatTexts);
      setSummary(result.summary);
      setQnaList(result.qna);
      setHostMessagesList(result.hostMessages || []);
      
      // Fallback filter: ensures the specified links are omitted even if the model hallucinates them
      const ignoredLinks = [
        "wa.me/+918910125705",
        "forms.gle/EuJBdyBHdNhRpbCL9",
        "link.be10x.in/brainfish-24/7-Support-Bot",
        "forms.gle/gQ42fB3pRniV5GPv7"
      ];
      
      const filteredLinks = result.links.filter(link => 
        !ignoredLinks.some(ignored => link.includes(ignored))
      );
      
      setLinksList(filteredLinks);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An error occurred during analysis.");
    } finally {
      clearInterval(intervalId);
      setIsAnalyzing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!customQuestion.trim() || !canAnalyze) return;
    setIsAsking(true);
    setAskError("");
    setCustomAnswer("");
    try {
      const vttTexts = await Promise.all(vttFiles.map(f => f.text()));
      const chatTexts = await Promise.all(chatFiles.map(f => f.text()));
      const answer = await askQuestionAboutSession(vttTexts, chatTexts, customQuestion);
      setCustomAnswer(answer);
    } catch (e: any) {
      console.error(e);
      setAskError(e.message || "An error occurred while answering your question.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleExportDocx = () => {
    if (summary) {
      generateDocx({
        summary,
        qna: qnaList,
        links: linksList,
        hostMessages: hostMessagesList,
      });
    }
  };

  const handleClearData = () => {
    setVttFiles([]);
    setChatFiles([]);
    setCsvFiles([]);
    setAttendanceData([]);
    setSummary("");
    setQnaList([]);
    setLinksList([]);
    setHostMessagesList([]);
    setError("");
    setCustomQuestion("");
    setCustomAnswer("");
    setAskError("");
  };

  const canAnalyze = vttFiles.length > 0 || chatFiles.length > 0;
  const hasResults = summary.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight">Session Analyzer</h1>
              <p className="text-xs text-gray-500 font-medium tracking-wide">Q&A EXTRACTION & ANALYTICS</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Top Section - Upload & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Upload Dropzones */}
          <section className="lg:col-span-8 bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <h2 className="text-xl font-medium mb-6">Import Meeting Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileDropzone 
                label="VTT Transcripts"
                accept=".vtt, .csv"
                files={vttFiles}
                onFilesAdded={setVttFiles}
                onFileRemove={(i) => setVttFiles(vttFiles.filter((_, idx) => idx !== i))}
              />
              <FileDropzone 
                label="Saved Chats"
                accept=".txt, .csv"
                multiple={true}
                files={chatFiles}
                onFilesAdded={setChatFiles}
                onFileRemove={(i) => setChatFiles(chatFiles.filter((_, idx) => idx !== i))}
              />
              <FileDropzone 
                label="Attendee Report"
                accept=".csv"
                multiple={false}
                files={csvFiles}
                onFilesAdded={handleCsvAdded}
                onFileRemove={() => handleCsvAdded([])}
              />
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {canAnalyze ? "Files ready for analysis." : "Upload VTT or Chat files to enable analysis."}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearData}
                  disabled={isAnalyzing || (!vttFiles.length && !chatFiles.length && !csvFiles.length && !summary)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Data</span>
                </button>
                <button 
                  onClick={handleAnalyze}
                disabled={!canAnalyze || isAnalyzing}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-sm",
                  canAnalyze && !isAnalyzing ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow" : 
                  isAnalyzing ? "bg-blue-600 text-white opacity-80 cursor-wait" : 
                  "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
                <span>{isAnalyzing ? loadingStatus : "Extract Q&A & Links"}</span>
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
          </section>

          {/* Analytics Snapshot */}
          <section className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-medium">Attendance Analytics</h2>
              </div>
              
              {analytics ? (
                <div className="space-y-6">
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Attendees</p>
                    <p className="text-4xl font-light text-gray-900">{analytics.totalAttendees}</p>
                  </div>
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Average Duration</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-light text-gray-900">{analytics.averageDuration}</p>
                      <span className="text-gray-500 pb-1 font-medium">mins</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl">
                  <p className="text-sm text-gray-400 text-center px-4">Upload an Attendee CSV report<br/>to view stats</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Ask AI Section */}
        {canAnalyze && (
          <section className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-medium">Ask AI about the Session</h2>
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="e.g. Did anyone ask about the new feature? What did the host say about the deadline?"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskQuestion();
                }}
              />
              <button
                onClick={handleAskQuestion}
                disabled={!customQuestion.trim() || isAsking}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isAsking ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Ask</span>
              </button>
            </div>
            {askError && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                {askError}
              </div>
            )}
            {customAnswer && (
              <div className="mt-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">AI Answer</h4>
                <p className="text-gray-800 whitespace-pre-wrap">{customAnswer}</p>
              </div>
            )}
          </section>
        )}

        {/* Results Section */}
        {hasResults && (
           <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-medium">Analysis Results</h2>
              </div>
              <button 
                onClick={handleExportDocx}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full font-medium hover:bg-black transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export DOCX</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                {/* Summary */}
                <section>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Session Summary</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {summary}
                  </p>
                </section>

                {/* Host Messages */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Host/Panelist Messages ({hostMessagesList.length})
                    </h3>
                    {hostMessagesList.length > 0 && (
                      <button 
                        onClick={handleCopyHostMessages}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copiedHostMessages ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedHostMessages ? "Copied" : "Copy Messages"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {hostMessagesList.map((msg, i) => (
                      <div key={i} className="p-4 bg-purple-50 rounded-2xl border border-purple-100/50">
                        <p className="font-medium text-purple-900 mb-1">{msg.sender}</p>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                    {hostMessagesList.length === 0 && <p className="text-gray-500 italic">No host messages found.</p>}
                  </div>
                </section>

                {/* QnA */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Extracted Q&A ({qnaList.length})
                    </h3>
                    {qnaList.length > 0 && (
                      <button 
                        onClick={handleCopyQnA}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copiedQnA ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedQnA ? "Copied" : "Copy Q&A"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-6">
                    {qnaList.map((item, i) => (
                      <div key={i} className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                        <p className="font-semibold text-gray-900 mb-2 flex gap-3">
                          <span className="text-blue-600">Q.</span>
                          <span>{item.question}</span>
                        </p>
                        <p className="text-gray-700 flex gap-3">
                          <span className="text-gray-400 font-semibold">A.</span>
                          <span>{item.answer}</span>
                        </p>
                      </div>
                    ))}
                    {qnaList.length === 0 && <p className="text-gray-500 italic">No Q&A found.</p>}
                  </div>
                </section>
              </div>

              {/* Links */}
              <div className="space-y-6 lg:border-l lg:border-gray-100 lg:pl-10">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Shared Links ({linksList.length})
                    </h3>
                    {linksList.length > 0 && (
                      <button 
                        onClick={handleCopyLinks}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copiedLinks ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLinks ? "Copied" : "Copy Links"}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    {linksList.map((link, i) => (
                      <a 
                        key={i} 
                        href={link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-3 bg-gray-50 hover:bg-gray-100 text-blue-600 hover:text-blue-700 rounded-xl text-sm font-medium transition-colors break-words border border-gray-100"
                      >
                        {link}
                      </a>
                    ))}
                    {linksList.length === 0 && <p className="text-gray-500 italic">No links extracted.</p>}
                  </div>
                </section>
              </div>
            </div>
           </div>
        )}
      </main>
    </div>
  );
}
