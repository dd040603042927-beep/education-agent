from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


ROOT = Path(r"E:\education-agent")
TEMPLATE = Path(r"D:\study\大二下\机器学习\实验3\姓名_学号_班级_实验三机器学习综合实验_你的工作流名称.docx")
OUT = ROOT / "吴永昶_24217020127_24人工1班_实验三机器学习综合实验_机器学习知识点问答与学习诊断助手.docx"
FIG = ROOT / "ml_learning_diagnosis_workflow.png"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_text(cell, text, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    p.paragraph_format.line_spacing = Pt(18)
    r = p.add_run(text)
    r.bold = bold
    set_run_font(r, size=11)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def set_run_font(run, font="宋体", size=12, bold=None, color=None):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def set_paragraph_format(p, after=0, before=0, first_line=True):
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    pf.line_spacing = Pt(20)
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    if first_line:
        pf.first_line_indent = Cm(0.74)


def remove_element(element):
    element.getparent().remove(element)


def add_body_paragraph(doc, text="", bold_prefix=None):
    p = doc.add_paragraph()
    set_paragraph_format(p)
    if bold_prefix and text.startswith(bold_prefix):
        r1 = p.add_run(bold_prefix)
        set_run_font(r1, bold=True)
        r2 = p.add_run(text[len(bold_prefix):])
        set_run_font(r2)
    else:
        r = p.add_run(text)
        set_run_font(r)
    return p


def add_section_heading(doc, title):
    p = doc.add_paragraph()
    set_paragraph_format(p, after=4, before=8, first_line=False)
    r = p.add_run(title)
    set_run_font(r, size=12, bold=True)
    return p


def add_subheading(doc, title):
    p = doc.add_paragraph()
    set_paragraph_format(p, after=2, before=6, first_line=False)
    r = p.add_run(title)
    set_run_font(r, size=12, bold=True)
    return p


def add_numbered(doc, items):
    for i, item in enumerate(items, 1):
        p = doc.add_paragraph()
        set_paragraph_format(p, after=0, first_line=False)
        r = p.add_run(f"{i}. {item}")
        set_run_font(r)


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for j, h in enumerate(headers):
        set_cell_text(hdr[j], h, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(hdr[j], "D9EAF7")
    for row in rows:
        cells = table.add_row().cells
        for j, value in enumerate(row):
            align = WD_ALIGN_PARAGRAPH.CENTER if j == 0 or len(str(value)) <= 12 else WD_ALIGN_PARAGRAPH.LEFT
            set_cell_text(cells[j], str(value), align=align)
    if widths:
        for row in table.rows:
            for idx, width in enumerate(widths):
                row.cells[idx].width = Cm(width)
    doc.add_paragraph()
    return table


def draw_workflow_figure():
    width, height = 1800, 980
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    font_path = r"C:\Windows\Fonts\simsun.ttc"
    font = ImageFont.truetype(font_path, 34)
    small = ImageFont.truetype(font_path, 26)
    title_font = ImageFont.truetype(font_path, 42)
    draw.text((70, 35), "机器学习知识点问答与学习诊断助手工作流结构", fill="#102A43", font=title_font)

    boxes = [
        (70, 130, 330, 230, "开始\n问题/回答/目标"),
        (410, 130, 670, 230, "输入清洗\n任务识别/关键词"),
        (760, 70, 1040, 170, "课程知识库 RAG\nkeypoints + quiz"),
        (760, 205, 1040, 305, "错因知识库 RAG\nmisconceptions"),
        (760, 340, 1040, 440, "项目知识图谱\n上下文证据"),
        (1120, 170, 1400, 290, "证据整理\n去重 + Top 3-5"),
        (70, 540, 350, 660, "朴素贝叶斯分类\n知识点 + Top3 概率"),
        (430, 540, 710, 660, "掌握度评分\n覆盖度/维度/错因"),
        (790, 515, 1070, 635, "LLM 标准解释\nqwen2.5:7b"),
        (1150, 515, 1430, 635, "条件分支\n问答/诊断"),
        (790, 705, 1070, 825, "LLM 诊断反馈\n错因/建议/追问"),
        (1150, 705, 1430, 825, "结构化 JSON\nfinal_answer/payload"),
        (1500, 705, 1740, 825, "HTTP 回调\n同步项目数据库"),
    ]

    for x1, y1, x2, y2, text in boxes:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=18, fill="#F7FBFF", outline="#2E74B5", width=3)
        lines = text.split("\n")
        total_h = len(lines) * 36
        y = y1 + (y2 - y1 - total_h) / 2
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font if len(line) <= 8 else small)
            draw.text((x1 + (x2 - x1 - (bbox[2] - bbox[0])) / 2, y), line, fill="#102A43", font=font if len(line) <= 8 else small)
            y += 38

    def arrow(a, b):
        draw.line((a[0], a[1], b[0], b[1]), fill="#486581", width=4)
        x, y = b
        draw.polygon([(x, y), (x - 16, y - 9), (x - 16, y + 9)], fill="#486581")

    arrow((330, 180), (410, 180))
    arrow((670, 160), (760, 120))
    arrow((670, 185), (760, 255))
    arrow((670, 210), (760, 390))
    arrow((1040, 120), (1120, 215))
    arrow((1040, 255), (1120, 230))
    arrow((1040, 390), (1120, 245))
    arrow((1260, 290), (210, 540))
    arrow((350, 600), (430, 600))
    arrow((710, 600), (790, 575))
    arrow((1070, 575), (1150, 575))
    arrow((1290, 635), (930, 705))
    arrow((1070, 765), (1150, 765))
    arrow((1430, 765), (1500, 765))

    draw.text((70, 900), "图 1  工作流从用户输入出发，并行检索课程知识库、错因知识库和项目图谱，再由朴素贝叶斯与评分规则驱动 LLM 生成可回流的诊断结果。", fill="#334E68", font=small)
    img.save(FIG)


def build_report():
    draw_workflow_figure()
    doc = Document(str(TEMPLATE))

    section = doc.sections[0]
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.54)
    section.right_margin = Cm(2.54)

    normal = doc.styles["Normal"]
    normal.font.name = "宋体"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    normal.font.size = Pt(12)
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    normal.paragraph_format.line_spacing = Pt(20)

    # Remove template requirement paragraphs and the one-column body placeholder table.
    for p in list(doc.paragraphs):
        txt = p.text.strip()
        if txt.startswith("其他要求") or txt.startswith("格式：") or txt.startswith("所提交"):
            remove_element(p._element)
    if len(doc.tables) > 1:
        remove_element(doc.tables[1]._element)

    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    add_section_heading(doc, "实验目的与要求")
    add_subheading(doc, "一、实验目的")
    add_numbered(doc, [
        "掌握 Dify 可视化工作流的输入变量、代码节点、知识检索节点、LLM 节点、条件分支、HTTP 回调和结束输出的组织方法。",
        "将检索增强生成（RAG）与经典机器学习算法结合，完成一个面向机器学习课程学习场景的知识问答与学习诊断任务。",
        "在工作流中实现多项式朴素贝叶斯知识点分类、掌握度评分、错因标签生成和个性化反馈输出，体现机器学习算法在真实业务中的应用。",
        "通过标准答案、诊断反馈、结构化 JSON 和项目回调 payload 的设计，完成从用户提问到项目系统同步的端到端闭环。",
    ])
    add_subheading(doc, "二、实验要求与本工作流对应关系")
    add_table(
        doc,
        ["要求项", "本工作流实现", "达成情况"],
        [
            ["RAG 组件", "设置“课程知识库检索_RAG”和“错因知识库检索_RAG”，分别绑定 ml_keypoints.md、ml_quiz_bank.md 与 ml_misconceptions.md。", "已完成"],
            ["机器学习算法", "在代码节点中实现多项式朴素贝叶斯知识点分类，并结合规则评分生成 mastery_score、error_tags 和 missing_points。", "已完成"],
            ["LLM 调用", "使用 qwen2.5:7b 生成标准解释与诊断反馈，提示词要求优先依据 RAG 证据。", "已完成"],
            ["明确输入输出", "开始节点包含问题、学生回答、学习目标、诊断深度、学生/班级/项目上下文等变量；结束节点输出 final_answer、structured_json、callback_payload 等。", "已完成"],
            ["创新与加分点", "加入项目知识图谱上下文、项目数据库 HTTP 回调、学生画像读取、教师端/学生端任务适配和结构化结果回流。", "已完成"],
        ],
        widths=[3.1, 11.0, 2.2],
    )

    add_section_heading(doc, "实验原理与内容")
    add_subheading(doc, "一、实验主题")
    add_body_paragraph(doc, "本实验基于提供的 Dify 工作流文件 ml_learning_diagnosis_assistant_upgraded_0_6_0.yml，设计并实现“机器学习知识点问答与学习诊断助手_升级版_多RAG_朴素贝叶斯诊断_0_6_0”。该工作流面向机器学习课程学习场景，既能回答知识点问题，也能在学生给出自我理解后进行掌握度诊断、错因分析和个性化学习建议生成。")
    add_body_paragraph(doc, "工作流的核心思想是：先把用户输入清洗为可检索、可分类、可评分的文本，再并行调用课程知识库、错因知识库和项目图谱上下文形成证据，随后用朴素贝叶斯定位知识点，用规则评分评估学生掌握程度，最后由 LLM 在证据约束下生成标准解释和诊断反馈，并以 JSON 形式回写项目系统。")

    add_subheading(doc, "二、总体流程")
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(FIG), width=Inches(6.4))
    caption = doc.add_paragraph("图 1  工作流总体结构图")
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_paragraph_format(caption, after=4, first_line=False)
    for run in caption.runs:
        set_run_font(run, size=10)

    add_body_paragraph(doc, "工作流共包含 13 个主要节点：开始、输入清洗与任务识别、课程知识库检索、错因知识库检索、项目知识图谱数据库、RAG 片段去重与证据整理、朴素贝叶斯知识点分类、掌握度评分、LLM 标准解释、问答或诊断条件分支、LLM 诊断反馈、结构化 JSON 输出、项目数据库同步和结束节点。节点之间形成“输入处理—多源检索—算法判断—生成解释—结构化回流”的流水线。")

    add_subheading(doc, "三、RAG 检索原理与知识库设计")
    add_body_paragraph(doc, "RAG 组件用于解决大模型回答容易脱离课程材料的问题。工作流将用户问题和学生回答先构造成两个查询：rag_query 面向课程知识库，misconception_query 面向错因知识库。课程知识库检索节点 top_k=5、score_threshold=0.35，错因知识库检索节点 top_k=5、score_threshold=0.30，检索模式均为 multiple。")
    add_body_paragraph(doc, "课程知识库建议绑定 ml_keypoints.md 和 ml_quiz_bank.md，内容包括机器学习基础、KNN、线性回归、逻辑回归、SVM、决策树、集成学习、KMeans、PCA、朴素贝叶斯、神经网络等知识点摘要、标准答案和评分点。错因知识库绑定 ml_misconceptions.md，内容包括概念混淆、任务类型错误、公式目标缺失、算法流程缺失、评价指标误用、泛化意识不足、数据预处理缺失等常见错因。")
    add_body_paragraph(doc, "证据整理节点把课程 RAG、错因 RAG 和项目知识图谱上下文合并，去除重复片段，保留前 3 到 5 条高价值证据，并输出 evidence_summary 和 citation_items。这样可以减少 LLM 重复引用、无依据扩写和跨来源冲突。")

    add_subheading(doc, "四、朴素贝叶斯知识点分类原理")
    add_body_paragraph(doc, "工作流在“朴素贝叶斯知识点分类_代码节点”中实现多项式朴素贝叶斯与关键词特征结合的分类器。节点读取清洗后的问题、学生回答和 RAG 证据，把每个机器学习知识点视为一个类别，例如 KNN、线性回归、逻辑回归、支持向量机、决策树、集成学习、KMeans 聚类、PCA 降维、朴素贝叶斯、神经网络等。")
    add_body_paragraph(doc, "算法假设在给定知识点类别 c 后，文本中的关键词特征近似条件独立。对输入文本 d，分类器计算后验概率 P(c|d)，实际实现时使用对数形式避免连乘下溢：")
    add_body_paragraph(doc, "log P(c|d) = log P(c) + Σ log P(w_i|c)。其中 P(c) 表示知识点先验，P(w_i|c) 表示词 w_i 在类别 c 下出现的条件概率；代码通过课程关键词表、RAG 证据和学生回答中的命中情况构造特征，并使用平滑思想避免未见词概率为 0。")
    add_body_paragraph(doc, "分类节点输出 topic_label、topic_probability 和 top_topic_candidates。其作用不是替代 LLM，而是为后续标准解释、掌握度评分和个性化诊断提供可解释的机器学习算法判断。")

    add_subheading(doc, "五、掌握度评分与错因诊断")
    add_body_paragraph(doc, "掌握度评分节点根据学生回答长度、关键词覆盖率、公式或目标函数、算法流程、适用场景、评价指标、数据预处理等维度进行综合评分。若学生未提供自我理解，工作流不会强行扣分，而是进入知识问答模式；若项目学习画像中已有历史掌握度，则可读取项目画像作为参考。")
    add_body_paragraph(doc, "评分逻辑以 28 分为基础，回答内容越完整、关键词覆盖越高、维度越齐全，得分越高；若出现典型错误则扣分并生成错因标签。例如把 KMeans 说成有标签分类会触发“概念混淆”和“任务类型错误”；把逻辑回归说成连续值回归且未说明分类概率，会触发“任务类型错误”；缺少公式或目标函数会触发“公式目标缺失”。")
    add_body_paragraph(doc, "评分节点最终输出 mastery_score、mastery_level、error_tags、missing_points、positive_points 和 project_sync_suggestion。该结果会被 LLM 诊断节点引用，保证自然语言反馈与算法评分一致。")

    add_subheading(doc, "六、LLM 生成与结构化回流")
    add_body_paragraph(doc, "工作流设置两个 LLM 节点，均使用 Ollama 提供的 qwen2.5:7b，temperature=0.25。低温度有利于保持解释稳定，减少无依据发挥。LLM 标准解释节点只生成标准答案、教学参考或任务结果，不评价学生掌握度；LLM 诊断反馈节点则结合学生回答、RAG 证据、朴素贝叶斯分类和掌握度评分，输出已掌握部分、错因分析、个性化建议、追问题和参考答案摘要。")
    add_body_paragraph(doc, "结构化 JSON 节点把 topic_label、topic_probability、top_topic_candidates、mastery_score、mastery_level、error_tags、missing_points、rag_evidence、standard_answer、diagnosis_feedback 和 next_questions 统一封装，同时构造 callback_payload。HTTP 回调节点把结果 POST 到 http://host.docker.internal:5107/api/integrations/dify/diagnosis-callback，用于同步项目数据库中的会话、错题记录或学习画像。")

    add_section_heading(doc, "实验设备与软件环境")
    add_table(
        doc,
        ["类别", "配置"],
        [
            ["实验平台", "Dify Workflow，可导入 YAML/DSL 文件复现实验；按实验要求建议使用不高于 1.14.2 的版本。"],
            ["工作流文件", r"E:\education-agent\dify\ml_learning_diagnosis\ml_learning_diagnosis_assistant_upgraded_0_6_0.yml"],
            ["知识库文件", "ml_keypoints.md、ml_quiz_bank.md、ml_misconceptions.md。"],
            ["LLM 模型", "qwen2.5:7b，provider 为 langgenius/ollama/ollama，chat 模式，temperature=0.25。"],
            ["算法环境", "Dify Python3 代码节点，实现输入清洗、证据整理、朴素贝叶斯分类、掌握度评分和 JSON 封装。"],
            ["项目接口", "host.docker.internal:5107 后端接口，诊断结果通过 HTTP 回调写入项目系统。"],
            ["实验机器", "Windows 环境，浏览器访问 Dify 控制台并导入工作流配置。"],
        ],
        widths=[4.0, 12.2],
    )

    add_section_heading(doc, "实验过程与结果")
    add_subheading(doc, "一、知识库准备")
    add_numbered(doc, [
        "新建“机器学习课程知识库”，上传 ml_keypoints.md 和 ml_quiz_bank.md，分段长度建议 400-600 tokens，重叠 50-100 tokens。",
        "新建“机器学习错因与评分标准知识库”，上传 ml_misconceptions.md，用于检索易错点、错因标签和评分依据。",
        "导入工作流 YAML 后，在“课程知识库检索_RAG”节点手动绑定课程知识库，在“错因知识库检索_RAG”节点手动绑定错因知识库。",
    ])

    add_subheading(doc, "二、工作流配置过程")
    add_numbered(doc, [
        "开始节点设置机器学习问题 question、学生自我理解 student_answer、学习目标 target_level、诊断深度 diagnosis_depth，以及学生 ID、班级 ID、会话 ID、请求 ID、课程章节、项目知识图谱上下文、项目 RAG 上下文、项目学生画像等可选变量。",
        "输入清洗节点统一去除多余空白、限制文本长度、识别知识问答模式或学习诊断模式，并抽取候选关键词，生成 rag_query 与 misconception_query。",
        "并行执行课程知识库 RAG、错因知识库 RAG 和项目知识图谱数据库节点，获得课程依据、错因依据和项目上下文证据。",
        "证据整理节点对多源片段进行去重、截断和摘要，输出给朴素贝叶斯、掌握度评分和 LLM。",
        "朴素贝叶斯节点对知识点进行分类，掌握度评分节点根据学生回答和分类结果生成分数、等级、错因标签和缺失点。",
        "LLM 标准解释节点生成不含学生评价的标准解释；条件分支根据 student_answer 是否为空区分问答模式和诊断模式；LLM 诊断反馈节点生成最终诊断建议。",
        "JSON 输出节点封装 final_answer、structured_json 和 callback_payload；HTTP 节点把诊断结果回写项目数据库；结束节点暴露关键输出供前端或教师评分查看。",
    ])

    add_subheading(doc, "三、核心节点配置结果")
    add_table(
        doc,
        ["节点", "输入", "输出/作用"],
        [
            ["输入清洗与任务识别", "question、student_answer、target_level、diagnosis_depth、assistant_task", "question_clean、diagnosis_mode、candidate_keywords、rag_query、misconception_query。"],
            ["课程知识库检索_RAG", "rag_query", "召回课程知识点、标准答案和评分点，top_k=5，score_threshold=0.35。"],
            ["错因知识库检索_RAG", "misconception_query", "召回常见误区、错因标签和评分标准，top_k=5，score_threshold=0.30。"],
            ["朴素贝叶斯分类", "问题、学生回答、RAG 证据", "topic_label、topic_probability、top_topic_candidates。"],
            ["掌握度评分", "topic_label、student_answer、evidence_summary", "mastery_score、mastery_level、error_tags、missing_points、positive_points。"],
            ["LLM 标准解释", "RAG 证据、知识点分类、学习目标", "核心结论、原理流程、公式机制、评价指标、易错提醒。"],
            ["LLM 诊断反馈", "标准解释、算法诊断、学生回答、RAG 证据", "已掌握部分、错因分析、个性化建议、追问题、参考答案摘要。"],
            ["结构化 JSON 与 HTTP 回调", "LLM 文本与算法结果", "final_answer、structured_json、callback_payload，并同步到项目接口。"],
        ],
        widths=[4.0, 5.3, 6.9],
    )

    add_subheading(doc, "四、测试样例与输出结果")
    add_body_paragraph(doc, "测试 1：知识问答模式。输入问题为“KNN 和 KMeans 的区别是什么？”，不填写学生自我理解，学习目标选择“考试复习”，诊断深度选择“标准”。工作流识别为知识问答模式，课程知识库和错因知识库分别召回 KNN、KMeans、分类与聚类混淆等证据，朴素贝叶斯输出候选知识点包含 KNN、KMeans 聚类和机器学习基础。由于未提供学生回答，掌握度输出为“未诊断”，LLM 标准解释从任务类型、是否有标签、K 的含义、流程和评价指标五个角度区分 KNN 与 KMeans，并给出自检追问。")
    add_body_paragraph(doc, "测试 2：学习诊断模式。输入问题为“请解释逻辑回归的核心思想和适用场景”，学生回答为“逻辑回归主要用来预测连续数值，和线性回归差不多，只要拟合一条直线即可。”工作流识别出该回答混淆了逻辑回归与线性回归，朴素贝叶斯定位知识点为“逻辑回归”，掌握度评分节点生成“任务类型错误、公式目标缺失、评价指标缺失”等错因标签。LLM 诊断反馈指出学生知道该算法与回归模型相关，但没有说明 Sigmoid、类别概率、交叉熵或分类评价指标，并建议从“输出概率—阈值分类—交叉熵训练—精确率/召回率/F1 评价”四步重新组织答案。")
    add_body_paragraph(doc, "测试 3：项目回流模式。输入包含 student_id、class_id、conversation_id、request_id 和 callback_url 时，结构化 JSON 节点会把诊断结果封装为 callback_payload，其中包含 question、student_answer、topic_label、mastery_score、mastery_level、error_tags、missing_points、rag_evidence、final_answer 和 structured_result。HTTP 回调节点负责把 payload 写入项目后端，便于教师端查看学生错因和班级学情。")

    add_table(
        doc,
        ["测试项", "输入摘要", "主要输出", "验证结论"],
        [
            ["知识问答", "只输入 KNN 与 KMeans 区别问题", "知识问答模式、标准解释、自检追问、未诊断掌握度", "未强行扣分，符合问答逻辑。"],
            ["学习诊断", "逻辑回归问题 + 错误学生回答", "逻辑回归分类、低/中掌握度、任务类型错误、补救建议", "算法诊断与 LLM 反馈一致。"],
            ["项目同步", "携带学生与会话上下文", "structured_json 与 callback_payload", "具备项目数据库回流能力。"],
        ],
        widths=[3.0, 5.2, 5.5, 2.5],
    )

    add_section_heading(doc, "操作异常问题与解决方案")
    add_table(
        doc,
        ["问题", "原因分析", "解决方案"],
        [
            ["导入 YAML 后 RAG 节点 dataset_ids 为空", "Dify 导出的 DSL 不会自动携带本地知识库 ID，导入到新环境后需要重新绑定。", "导入后手动选择课程知识库和错因知识库，并检查 top_k 与 score_threshold。"],
            ["测试运行时 graph_context_url 为空或本地地址被拦截", "Docker 版 Dify 对本地地址访问可能触发 SSRF 限制；未传 URL 时 HTTP 节点会报 url is required。", "工作流把项目知识图谱上下文改为代码节点，从开始节点传入 project_graph_context，避免空 URL 和 SSRF 问题。"],
            ["RAG 召回片段重复或证据过长", "课程知识点、题库和错因库中存在相近描述，直接传给 LLM 会造成冗余。", "增加“RAG片段去重与证据整理_代码节点”，合并多源证据并保留前 3-5 条。"],
            ["学生未提交自我理解时无法评分", "学习诊断需要 student_answer，否则评分会缺少依据。", "输入清洗节点区分知识问答模式和学习诊断模式；未提供回答时不扣分，只生成标准解释和自检追问。"],
            ["LLM 可能脱离证据或评价与分数矛盾", "大模型生成存在随机性，若提示词不约束会虚构证据或过度评价。", "系统提示要求优先依据 RAG 证据，诊断节点必须引用算法评分、错因标签和缺失点，不得给出矛盾评价。"],
            ["项目回调访问宿主机失败", "Dify 运行在 Docker 容器内，127.0.0.1 指向容器自身而不是宿主机。", "HTTP 节点使用 host.docker.internal:5107 访问宿主机后端，并设置 Bearer Token 与 DIFY_CALLBACK_TOKEN 一致。"],
        ],
        widths=[4.2, 6.1, 5.9],
    )

    add_section_heading(doc, "实验总结")
    add_body_paragraph(doc, "本次实验完成了一个以机器学习课程学习诊断为主题的 Dify 智能工作流。该工作流不是简单调用 LLM 回答问题，而是把课程知识库、错因知识库、项目知识图谱、朴素贝叶斯分类、掌握度评分、提示工程和项目回调整合为一个完整系统，能够支持学生端问答、学生端诊断、教师端批改依据和项目端学情同步。")
    add_body_paragraph(doc, "从 RAG 角度看，工作流把课程知识、题库标准答案和错因评分标准拆分为不同知识库，分别承担“给依据”和“找错误”的职责，减少了单一知识库召回不精准的问题。从机器学习角度看，朴素贝叶斯分类器承担了可解释的知识点定位功能，掌握度评分节点承担了可量化的学习诊断功能，使整个系统不仅能生成自然语言，还能输出结构化、可追踪、可回流的数据。")
    add_body_paragraph(doc, "从工程实现角度看，本工作流考虑了导入复现、知识库绑定、学生画像、教师端与学生端任务差异、Docker 网络访问、SSRF 限制、JSON 输出规范和数据库同步等问题。最终输出既包含适合用户阅读的 final_answer，也包含适合后端处理的 structured_json 和 callback_payload，满足实验对 RAG、机器学习算法、LLM 调用、明确输入输出以及创新性的要求。")
    add_body_paragraph(doc, "通过本实验，我进一步理解了智能工作流不是把多个节点简单串联，而是要让每个节点承担清晰职责：RAG 提供证据，算法提供判断，LLM 负责表达，结构化输出负责系统集成。后续如果继续优化，可以增加真实运行截图、模型效果统计、更多题型覆盖、教师端批量学情分析和前端 API 嵌入页面，使该工作流从实验作品进一步扩展为可长期使用的课程 AI 助教模块。")

    # Apply font and paragraph format to all text, including template residue.
    for p in doc.paragraphs:
        if p.text.strip() and p.paragraph_format.line_spacing is None:
            set_paragraph_format(p)
        for run in p.runs:
            if run.text:
                size = run.font.size.pt if run.font.size else 12
                set_run_font(run, size=size, bold=run.bold)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
                    p.paragraph_format.line_spacing = Pt(18)
                    for run in p.runs:
                        if run.text:
                            set_run_font(run, size=11, bold=run.bold)

    doc.save(str(OUT))


if __name__ == "__main__":
    build_report()
    print(OUT)
