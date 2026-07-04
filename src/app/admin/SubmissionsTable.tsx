"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { DOC_TYPES } from "@/lib/tasks";

interface Att {
  id: number;
  fileName: string;
  fileType: string;
  size: number;
}
export interface TableRow {
  id: number;
  taskTitle: string;
  bizRegNo: string;
  companyName: string;
  ceoName: string;
  applicantName: string;
  phone: string;
  email: string;
  reason: string;
  techExperience: string;
  createdAt: string;
  attachments: Att[];
}

const docLabel = (key: string) => DOC_TYPES.find((d) => d.key === key)?.label || key;

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm text-slate-800">{value || "-"}</div>
    </div>
  );
}

export default function SubmissionsTable({ rows }: { rows: TableRow[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const COLS = 7;

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-600">
        접수 목록 ({rows.length}건) · 행을 클릭하면 상세와 첨부가 펼쳐집니다
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="w-8 px-3 py-3"></th>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">과제</th>
              <th className="px-4 py-3">상호</th>
              <th className="px-4 py-3">대표자</th>
              <th className="px-4 py-3">제출자</th>
              <th className="px-4 py-3">제출일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="px-4 py-10 text-center text-slate-400">
                  조건에 맞는 접수 내역이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const open = openId === r.id;
                return (
                  <RowGroup key={r.id} row={r} open={open} onToggle={() => setOpenId(open ? null : r.id)} cols={COLS} />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({
  row,
  open,
  onToggle,
  cols,
}: {
  row: TableRow;
  open: boolean;
  onToggle: () => void;
  cols: number;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-slate-50 ${open ? "bg-navy-50/60" : ""}`}
        onClick={onToggle}
      >
        <td className="px-3 py-3 text-center text-slate-400">
          <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        </td>
        <td className="px-4 py-3 font-semibold text-navy-700">{row.id}</td>
        <td className="px-4 py-3">{row.taskTitle}</td>
        <td className="px-4 py-3 font-medium text-slate-700">{row.companyName}</td>
        <td className="px-4 py-3">{row.ceoName}</td>
        <td className="px-4 py-3">{row.applicantName}</td>
        <td className="px-4 py-3 text-slate-500">{formatDateTime(row.createdAt)}</td>
      </tr>

      {open && (
        <tr className="bg-slate-50/70">
          <td></td>
          <td colSpan={cols - 1} className="px-4 pb-6 pt-1">
            <div className="grid gap-4 sm:grid-cols-3">
              <Info label="사업자등록번호" value={row.bizRegNo} />
              <Info label="연락처" value={row.phone} />
              <Info label="이메일" value={row.email} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="text-xs text-slate-400">지원 사유</div>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800">
                  {row.reason}
                </p>
              </div>
              <div>
                <div className="text-xs text-slate-400">보유 기술 / 실적</div>
                <p className="mt-1 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800">
                  {row.techExperience}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-400">첨부 서류</div>
              {row.attachments.length === 0 ? (
                <p className="mt-1 text-sm text-slate-400">첨부된 파일이 없습니다.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {row.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/api/admin/download/${a.id}`}
                        className="inline-flex items-center gap-2 rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span aria-hidden>⬇</span>
                        <span className="font-medium">{docLabel(a.fileType)}</span>
                        <span className="max-w-[220px] truncate text-slate-500" title={a.fileName}>
                          {a.fileName}
                        </span>
                        <span className="text-xs text-slate-400">{(a.size / 1024 / 1024).toFixed(2)}MB</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <Link
                href={`/admin/submissions/${row.id}`}
                className="text-xs text-navy-600 underline"
                onClick={(e) => e.stopPropagation()}
              >
                상세 페이지 열기 →
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
