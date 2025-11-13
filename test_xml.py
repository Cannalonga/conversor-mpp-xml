#!/usr/bin/env python3
"""
Gerador de XML de teste para verificar a conversão
"""

def generate_test_xml():
    fileName = "C542-N-A4-36-0023 - 19-04-24 -OBRA"
    
    xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <Name>{fileName}</Name>
    <Title>Projeto convertido do MPP - TESTE</Title>
    <CreationDate>2025-11-13</CreationDate>
    <LastSaved>2025-11-13</LastSaved>
    <ScheduleFromStart>1</ScheduleFromStart>
    <StartDate>2025-11-13</StartDate>
    <CurrencySymbol>R$</CurrencySymbol>
    <CalendarUID>1</CalendarUID>
    
    <Tasks>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Planejamento da Obra</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>2025-11-13T08:00:00</CreateDate>
            <Start>2025-11-13T08:00:00</Start>
            <Finish>2025-11-15T17:00:00</Finish>
            <Duration>PT16H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT16H0M0S</Work>
        </Task>
        <Task>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Fundação</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>2025-11-13T08:00:00</CreateDate>
            <Start>2025-11-16T08:00:00</Start>
            <Finish>2025-11-20T17:00:00</Finish>
            <Duration>PT32H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT32H0M0S</Work>
        </Task>
        <Task>
            <UID>3</UID>
            <ID>3</ID>
            <Name>Estrutura</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>2025-11-13T08:00:00</CreateDate>
            <Start>2025-11-21T08:00:00</Start>
            <Finish>2025-11-30T17:00:00</Finish>
            <Duration>PT64H0M0S</Duration>
            <DurationFormat>7</DurationFormat>
            <Work>PT64H0M0S</Work>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Engenheiro Civil</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <StandardRate>150000</StandardRate>
            <OvertimeRate>200000</OvertimeRate>
        </Resource>
        <Resource>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Pedreiro</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <StandardRate>80000</StandardRate>
        </Resource>
        <Resource>
            <UID>3</UID>
            <ID>3</ID>
            <Name>Operador de Máquinas</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <StandardRate>100000</StandardRate>
        </Resource>
    </Resources>
    
    <Assignments>
        <Assignment>
            <UID>1</UID>
            <TaskUID>1</TaskUID>
            <ResourceUID>1</ResourceUID>
            <Work>PT16H0M0S</Work>
            <Start>2025-11-13T08:00:00</Start>
            <Finish>2025-11-15T17:00:00</Finish>
        </Assignment>
        <Assignment>
            <UID>2</UID>
            <TaskUID>2</TaskUID>
            <ResourceUID>2</ResourceUID>
            <Work>PT32H0M0S</Work>
            <Start>2025-11-16T08:00:00</Start>
            <Finish>2025-11-20T17:00:00</Finish>
        </Assignment>
        <Assignment>
            <UID>3</UID>
            <TaskUID>3</TaskUID>
            <ResourceUID>3</ResourceUID>
            <Work>PT64H0M0S</Work>
            <Start>2025-11-21T08:00:00</Start>
            <Finish>2025-11-30T17:00:00</Finish>
        </Assignment>
    </Assignments>
</Project>'''

    # Salvar o arquivo
    with open(f'{fileName}.xml', 'w', encoding='utf-8') as f:
        f.write(xml_content)
    
    print(f"✅ XML gerado: {fileName}.xml")
    print("📊 Contém: 3 tarefas, 3 recursos, 3 atribuições")
    print("🔧 Estrutura Microsoft Project válida")

if __name__ == "__main__":
    generate_test_xml()