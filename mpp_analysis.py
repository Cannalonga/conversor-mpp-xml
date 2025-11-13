"""
MPP File Structure Analysis and XML Conversion
Análise completa da estrutura de arquivos Microsoft Project (.mpp)

COMPLEXIDADES DOS ARQUIVOS MPP:
===============================

1. ESTRUTURA HIERÁRQUICA DE TAREFAS
   - Tarefas principais (Summary Tasks)
   - Subtarefas com múltiplos níveis
   - Tarefas críticas e não-críticas
   - Marcos (Milestones)
   - Tarefas recorrentes

2. DEPENDÊNCIAS E RELACIONAMENTOS
   - Finish-to-Start (FS) - mais comum
   - Start-to-Start (SS)
   - Finish-to-Finish (FF)
   - Start-to-Finish (SF)
   - Leads e Lags (antecipações/atrasos)

3. RECURSOS E ALOCAÇÃO
   - Recursos humanos (Work Resources)
   - Recursos materiais (Material Resources)
   - Recursos de custo (Cost Resources)
   - Calendários personalizados
   - Taxas variáveis por período

4. CAMPOS TEMPORAIS
   - Datas de início/fim planejadas
   - Datas reais (Actual)
   - Durações e trabalho
   - Percentual de conclusão
   - Linhas de base (Baselines)

5. CAMPOS FINANCEIROS
   - Custos por tarefa
   - Custos por recurso
   - Orçamentos e variações
   - Custos fixos e variáveis

6. METADADOS E PROPRIEDADES
   - Informações do projeto
   - Campos personalizados
   - Fórmulas e cálculos
   - Formatação e visualização

DESAFIOS TÉCNICOS:
=================

1. FORMATO PROPRIETÁRIO
   - Formato binário complexo
   - Múltiplas versões (2003, 2007, 2010, 2013, 2016, 2019, 2021)
   - Compressão interna
   - Estruturas OLE/COM

2. INTEGRIDADE DE DADOS
   - Preservar todas as relações
   - Manter cálculos automáticos
   - Validar dependências circulares
   - Preservar formatação

3. PERFORMANCE
   - Arquivos grandes (>100MB comuns)
   - Milhares de tarefas
   - Processamento eficiente

ESTRATÉGIAS DE CONVERSÃO:
========================

1. ABORDAGEM NATIVA (Recomendada)
   - Microsoft Project Interop
   - COM automation
   - Acesso completo a todos os dados

2. ABORDAGEM BIBLIOTECAS PYTHON
   - python-msp
   - pypandoc com plugins
   - Parsers personalizados

3. ABORDAGEM HÍBRIDA
   - Extração via COM/Interop
   - Processamento Python
   - Validação cruzada
"""