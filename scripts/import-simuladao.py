import json
import re
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "1000 questões" / "Quase-1000-problemas-resolvidos.pdf"
OUT_TS = ROOT / "app" / "simuladao-questions.ts"
OUT_IMAGES = ROOT / "public" / "sources" / "simuladao-fisica"

QUESTION_PAGE_START = 2
QUESTION_PAGE_END = 158
SOLUTION_PAGE_START = 158

TOPIC_RANGES = [
    (1, 90, "Cinemática"),
    (91, 236, "Dinâmica"),
    (237, 266, "Estática"),
    (267, 306, "Hidrostática"),
    (307, 314, "Hidrodinâmica"),
    (315, 439, "Termologia"),
    (440, 530, "Óptica Geométrica"),
    (531, 609, "Ondulatória"),
    (610, 720, "Eletrostática"),
    (721, 843, "Eletrodinâmica"),
    (844, 919, "Eletromagnetismo"),
]

ANSWER_LABELS = {"a": 0, "b": 1, "c": 2, "d": 3, "e": 4}
CID_REPLACEMENTS = {
    "(cid:1)": "-",
    "(cid:2)": "=",
    "(cid:3)": "<",
    "(cid:4)": "x",
    "(cid:5)": "x",
    "(cid:6)": "+",
    "(cid:7)": "Delta",
    "(cid:8)": "theta",
    "(cid:9)": "pi",
    "(cid:10)": "lambda",
    "(cid:11)": "mu",
    "(cid:12)": "+",
    "(cid:13)": "<",
    "(cid:14)": "Delta",
    "(cid:15)": "ohm",
    "(cid:16)": "alpha",
    "(cid:17)": "beta",
    "(cid:18)": "gamma",
    "(cid:19)": "rho",
    "(cid:20)": "sigma",
    "(cid:21)": "ohm",
    "(cid:22)": "phi",
    "(cid:23)": "omega",
    "(cid:24)": "sqrt",
    "(cid:25)": "infinito",
    "(cid:26)": "aprox.",
    "(cid:27)": "graus",
    "(cid:28)": "vetor",
    "(cid:29)": "",
    "(cid:30)": "",
    "(cid:31)": "",
}


def clean_text(value: str) -> str:
    for source, target in CID_REPLACEMENTS.items():
        value = value.replace(source, target)
    value = value.replace("ﬁ", "fi").replace("ﬂ", "fl")
    value = value.replace("000421 (", "000\n421 (")
    value = value.replace("L441 (", "L\n441 (")
    value = re.sub(r"([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç])(\d{2,3})(\s*\()", r"\1\n\2\3", value)
    value = re.sub(r"(\d{3})(\d{3})(\s*\()", r"\1\n\2\3", value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"000\s*421\s*\(", "000\n421 (", value)
    value = re.sub(r"L\s*441\s*\(", "L\n441 (", value)
    value = re.sub(r" ?-\n ?", "", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def topic_for(number: int) -> str:
    for start, end, topic in TOPIC_RANGES:
        if start <= number <= end:
            return topic
    return "Física geral"


def extract_columns(page) -> list[str]:
    width = page.width
    height = page.height
    boxes = [
        (35, 48, width / 2 - 8, height - 42),
        (width / 2 + 8, 48, width - 35, height - 42),
    ]
    chunks = []
    for box in boxes:
        text = page.crop(box).extract_text(x_tolerance=1, y_tolerance=3) or ""
        text = clean_text(text)
        text = re.sub(r"\bSIMULADÃO\b.*", "", text)
        if text:
            chunks.append(text)
    return chunks


def extract_question_blocks(pdf) -> list[dict]:
    blocks = []
    pending_context = ""
    pattern = re.compile(r"(?m)^(?P<num>\d{1,3})\s*(?=\(|[A-ZÁÉÍÓÚÂÊÔÃÕÇ])")
    for page_index in range(QUESTION_PAGE_START - 1, QUESTION_PAGE_END):
        page_number = page_index + 1
        for column_text in extract_columns(pdf.pages[page_index]):
            matches = list(pattern.finditer(column_text))
            if not matches:
                pending_context = (pending_context + "\n" + column_text).strip()
                continue
            if matches[0].start() > 0:
                pending_context = (pending_context + "\n" + column_text[: matches[0].start()]).strip()
            for index, match in enumerate(matches):
                start = match.start()
                end = matches[index + 1].start() if index + 1 < len(matches) else len(column_text)
                raw = column_text[start:end].strip()
                number = int(match.group("num"))
                if number < 1 or number > 919:
                    continue
                if pending_context and re.search(r"questões?\s+\d+", pending_context, re.I):
                    raw = pending_context + "\n" + raw
                pending_context = ""
                blocks.append({"number": number, "page": page_number, "raw": clean_text(raw)})
    recovered = []
    for block in blocks:
        split_done = False
        for embedded in (421, 441):
            if block["number"] == embedded - 1:
                marker = re.search(rf"{embedded}\s*\(", block["raw"])
                if marker:
                    recovered.append({**block, "raw": block["raw"][: marker.start()].strip()})
                    recovered.append({
                        "number": embedded,
                        "page": block["page"],
                        "raw": block["raw"][marker.start() :].strip(),
                    })
                    split_done = True
                    break
        if not split_done:
            recovered.append(block)

    unique = []
    for block in recovered:
        number = block["number"]
        existing = next((item for item in unique if item["number"] == number), None)
        if existing and number == 650 and any(item["number"] == 658 for item in unique):
            block["number"] = 659
            unique.append(block)
            continue
        if existing and number > 1 and not any(item["number"] == number - 1 for item in unique):
            existing["number"] = number - 1
            unique.append(block)
            continue
        if existing:
            continue
        unique.append(block)
    return unique


def extract_answers(pdf) -> dict[int, str]:
    text = "\n".join(
        clean_text(pdf.pages[i].extract_text(x_tolerance=1, y_tolerance=3) or "")
        for i in range(SOLUTION_PAGE_START - 1, len(pdf.pages))
    )
    answers = {}
    for match in re.finditer(r"\b(\d{1,3})\s+Alternativa\s+([a-e])\.", text, re.I):
        number = int(match.group(1))
        if 1 <= number <= 919:
            answers[number] = match.group(2).lower()
    return answers


def split_question(raw: str, number: int) -> tuple[str, str, list[str]]:
    text = re.sub(rf"^{number}\s+", "", raw).strip()
    title = f"Problema {number} de {topic_for(number)}"
    source_match = re.match(r"^\(([^)]+)\)\s*(.*)", text, re.S)
    if source_match:
        title = f"{source_match.group(1).strip()} - problema {number}"
        text = source_match.group(2).strip()
    option_matches = list(re.finditer(r"(?<!\w)([a-e])\)\s*", text, re.I))
    if len(option_matches) >= 2:
        statement = text[: option_matches[0].start()].strip()
        options_by_label = {}
        for index, option_match in enumerate(option_matches):
            label = option_match.group(1).lower()
            end = option_matches[index + 1].start() if index + 1 < len(option_matches) else len(text)
            option = text[option_match.end() : end].strip(" .\n")
            option = re.sub(r"\s+", " ", option)
            if option:
                options_by_label[label] = option
        options = [options_by_label[label] for label in "abcde" if label in options_by_label]
    else:
        statement = text
        options = ["Questão discursiva ou com alternativas gráficas. Consulte a página original e a resolução."]
    if not options:
        options = ["Questão discursiva ou com alternativas gráficas. Consulte a página original e a resolução."]
    statement = clean_text(statement)
    if len(statement) < 30:
        statement = clean_text(text)
    return title, statement, options


def render_source_pages() -> None:
    OUT_IMAGES.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(SOURCE))
    for page_number in range(QUESTION_PAGE_START, QUESTION_PAGE_END + 1):
        output = OUT_IMAGES / f"page-{page_number:03d}.jpg"
        if output.exists():
            continue
        page = pdf[page_number - 1]
        bitmap = page.render(scale=1.6, rotation=0)
        image = bitmap.to_pil().convert("RGB")
        image.thumbnail((1000, 1400), Image.Resampling.LANCZOS)
        image.save(output, "JPEG", quality=68, optimize=True, progressive=True)


def build_questions() -> list[dict]:
    with pdfplumber.open(SOURCE) as pdf:
        blocks = extract_question_blocks(pdf)
        answers = extract_answers(pdf)

    questions = []
    for block in blocks:
        number = block["number"]
        title, statement, options = split_question(block["raw"], number)
        answer_label = answers.get(number)
        answer = ANSWER_LABELS[answer_label] if answer_label in ANSWER_LABELS and len(options) >= 5 else None
        status = "Importada" if answer is not None else "Discursiva"
        questions.append(
            {
                "id": 80000000 + number,
                "code": f"Simuladão Física · Q{number}",
                "institution": "FTD",
                "institutionName": "Editora FTD",
                "edition": "Quase 2000 Problemas Resolvidos",
                "phase": "Livro de problemas resolvidos - Física",
                "year": 0,
                "number": number,
                "topic": topic_for(number),
                "level": "Médio",
                "title": title,
                "text": statement,
                "options": options,
                "answer": answer,
                "answerLabel": answer_label.upper() if answer is not None and answer_label else None,
                "status": status,
                "video": "",
                "scriptStatus": "Pendente",
                "sourcePage": block["page"],
                "sourceFile": "Simuladão: Quase 2000 Problemas Resolvidos de Física e Química - Física, José Carlos Alvarenga e Benigno Barreto Filho, Editora FTD",
                "sourceImage": f"/sources/simuladao-fisica/page-{block['page']:03d}.jpg",
                "essentialFigure": bool(re.search(r"\b(figura|gráfico|mapa|esquema|representa|mostra|abaixo|ao lado)\b", statement, re.I)),
            }
        )
    return questions


def write_typescript(questions: list[dict]) -> None:
    payload = json.dumps(questions, ensure_ascii=False, indent=2)
    OUT_TS.write_text(
        "import type { Question } from './questions';\n\n"
        "// Questões extraídas do volume de Física do Simuladão, com fonte original vinculada por página.\n"
        f"export const simuladaoQuestions: Question[] = {payload};\n",
        encoding="utf-8",
    )


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    render_source_pages()
    questions = build_questions()
    missing = sorted(set(range(1, 920)) - {item["number"] for item in questions})
    if missing:
        raise RuntimeError(f"Questões não extraídas: {missing[:30]} ({len(missing)} ausentes)")
    write_typescript(questions)
    option_counts = {}
    for item in questions:
        option_counts[len(item["options"])] = option_counts.get(len(item["options"]), 0) + 1
    print(json.dumps({
        "questions": len(questions),
        "with_answer": sum(1 for item in questions if item["answer"] is not None),
        "without_answer": sum(1 for item in questions if item["answer"] is None),
        "option_counts": option_counts,
        "images": len(list(OUT_IMAGES.glob("page-*.jpg"))),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
