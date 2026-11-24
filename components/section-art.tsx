const drawings: Record<string, string> = {
 notes: 'M97 29h70v77H97z M110 53l5 5 9-10 M131 55h22 M110 75l5 5 9-10 M131 77h22',
 habits: 'M90 83c19-41 60-51 88-25 M98 92c33 18 65 10 83-19 M119 69l15 15 27-34',
 ledger: 'M93 46h77v51H93z M93 46l63-15 5 15 M144 61h36v22h-36z M152 72h3',
 journal: 'M92 47q26-6 40 10v45q-14-16-40-10z M132 57q17-16 43-10v45q-26-6-43 10 M152 81V61l14-4v17 M148 82h4 M162 75h4',
 memos: 'M101 36h65v49l-21 20h-44z M145 105V85h21 M113 56h39 M113 68h30',
 documents: 'M105 34h44l17 17v55h-61z M149 34v17h17 M117 65h34 M117 77h25 M117 89h19',
 calendar: 'M96 49h74v52H96z M96 60h74 M113 40v15 M152 40v15 M113 75h7m12 0h7m12 0h7 M113 87h7m12 0h7',
 insights: 'M95 45v55h78 M106 86l20-18 17 9 26-29 M155 48h14v14',
 pet: 'M118 47l13-13 13 13 M165 62v22q0 15-15 15h-36q-15 0-15-15V62q0-15 15-15h36q15 0 15 15z M116 72h2 M147 72h2 M125 82q7 7 14 0',
 account: 'M133 34q17 13 32 13v26q0 21-32 35-32-14-32-35V47q15 0 32-13z M119 71l10 10 19-20',
 focus: 'M149 40h-34 M133 40v10 M157 49l9 9 M133 62v15l10 7 M160 78a27 27 0 1 1-54 0 27 27 0 1 1 54 0'
};

export function SectionArt({section}: {section: string}) {
 return <svg className="orbit-section-art" viewBox="0 0 225 135" aria-hidden="true" fill="none">
  <ellipse cx="133" cy="68" rx="86" ry="49" transform="rotate(-18 133 68)" opacity=".32"/>
  <ellipse cx="133" cy="68" rx="73" ry="59" opacity=".16"/>
  <path d="M57 48v12m-6-6h12m132 32v16m-8-8h16M177 20v9m-4.5-4.5h9" opacity=".65"/>
  <circle cx="71" cy="98" r="3" fill="currentColor"/>
  <path d={drawings[section]}/>
 </svg>;
}
