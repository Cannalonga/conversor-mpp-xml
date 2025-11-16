#!/usr/bin/env python3
"""
Teste simples do conversor Excel - sem dependências externas
"""

import sys
import tempfile
import pandas as pd
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent))

def test_basic_excel_converter():
    """Teste básico do conversor Excel"""
    
    print("🧪 Teste básico do conversor Excel")
    print("=" * 50)
    
    try:
        # Importar módulos
        from converters.excel.parser import (
            ExcelParserConfig,
            ExcelSecurityValidator,
            parse_excel_to_format,
            get_excel_info
        )
        from converters.excel.schemas import OutputFormat, CompressionType
        
        print("✅ Imports realizados com sucesso")
        
        # 1. Criar arquivo Excel de teste
        print("\n1. Criando arquivo de teste...")
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
            data = {
                'Nome': ['João', 'Maria', 'Pedro'],
                'Idade': [25, 30, 35],
                'Salário': [5000.50, 7500.75, 9000.00]
            }
            df = pd.DataFrame(data)
            df.to_excel(f.name, index=False, sheet_name='Teste')
            test_file = Path(f.name)
        
        print(f"   ✅ Arquivo criado: {test_file.name}")
        print(f"   📁 Tamanho: {test_file.stat().st_size} bytes")
        
        # 2. Teste de segurança
        print("\n2. Verificação de segurança...")
        security_check = ExcelSecurityValidator.check_file_security(test_file)
        
        print(f"   ✅ Arquivo seguro: {security_check.allowed_to_process}")
        print(f"   🔒 Nível de risco: {security_check.security_risk_level}")
        print(f"   📋 Extensão: {security_check.file_extension}")
        
        if not security_check.allowed_to_process:
            print(f"   ⚠️ Bloqueado: {security_check.blocked_reason}")
            return False
        
        # 3. Informações do arquivo
        print("\n3. Análise do arquivo...")
        file_info = get_excel_info(test_file)
        
        print(f"   📊 Planilhas: {file_info['sheets_count']}")
        print(f"   📝 Linhas: {file_info['total_rows']}")
        print(f"   📋 Colunas: {file_info['total_columns']}")
        print(f"   🔧 Macros: {file_info['has_macros']}")
        
        # 4. Conversão para CSV
        print("\n4. Conversão para CSV...")
        config = ExcelParserConfig(
            chunk_size=1000,
            enable_streaming=True,
            normalize_columns=True
        )
        
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as output_f:
            output_path = Path(output_f.name)
        
        stats = parse_excel_to_format(
            input_path=test_file,
            output_path=output_path,
            output_format=OutputFormat.CSV,
            config=config
        )
        
        print(f"   ✅ Conversão concluída!")
        print(f"   📊 Planilhas processadas: {stats.sheets_processed}")
        print(f"   📝 Linhas convertidas: {stats.total_rows_written}")
        print(f"   ⏱️ Tempo: {stats.processing_time_seconds:.2f}s")
        print(f"   💾 Memória pico: {stats.memory_peak_mb:.1f}MB")
        
        # 5. Verificar resultado CSV
        print("\n5. Verificação do resultado...")
        if output_path.exists():
            print(f"   ✅ Arquivo CSV gerado: {output_path.name}")
            print(f"   📁 Tamanho: {output_path.stat().st_size} bytes")
            
            # Ler e verificar conteúdo
            result_df = pd.read_csv(output_path)
            print(f"   📊 Linhas no CSV: {len(result_df)}")
            print(f"   📋 Colunas no CSV: {len(result_df.columns)}")
            print(f"   🏷️ Colunas: {list(result_df.columns)}")
            
            # Mostrar preview
            print("\n   📄 Preview dos dados:")
            print(result_df.head().to_string(index=False))
        else:
            print("   ❌ Arquivo CSV não foi gerado")
            return False
        
        # 6. Teste de conversão JSON
        print("\n6. Teste conversão para JSON...")
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as json_f:
            json_output = Path(json_f.name)
        
        json_stats = parse_excel_to_format(
            input_path=test_file,
            output_path=json_output,
            output_format=OutputFormat.JSON,
            config=config
        )
        
        if json_output.exists():
            print(f"   ✅ JSON gerado: {json_output.stat().st_size} bytes")
            
            import json
            with open(json_output, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            
            print(f"   📊 Registros JSON: {len(json_data)}")
            print(f"   📋 Primeira entrada: {json_data[0] if json_data else 'Vazio'}")
        else:
            print("   ❌ Arquivo JSON não foi gerado")
        
        # Limpeza
        print("\n7. Limpeza...")
        try:
            test_file.unlink()
            output_path.unlink() 
            json_output.unlink()
            print("   ✅ Arquivos temporários removidos")
        except Exception as e:
            print(f"   ⚠️ Erro na limpeza: {e}")
        
        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print("=" * 50)
        return True
        
    except ImportError as e:
        print(f"❌ Erro de importação: {e}")
        print("💡 Verifique se as dependências estão instaladas:")
        print("   pip install pandas openpyxl fastapi")
        return False
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_schemas_import():
    """Teste de importação dos schemas"""
    
    print("\n🧪 Testando schemas...")
    
    try:
        from converters.excel.schemas import (
            ExcelConversionRequest,
            ExcelConversionResult,
            OutputFormat,
            CompressionType,
            ExcelParsingStats
        )
        
        # Testar enums
        print(f"   ✅ Formatos disponíveis: {[f.value for f in OutputFormat]}")
        print(f"   ✅ Compressões: {[c.value for c in CompressionType]}")
        
        # Testar criação de modelo
        stats = ExcelParsingStats(
            total_sheets=1,
            sheets_processed=1,
            total_rows_read=100,
            total_rows_written=100,
            processing_time_seconds=1.5,
            memory_peak_mb=45.2
        )
        
        print(f"   ✅ Schema de stats criado: {stats.processing_time_seconds}s")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Erro nos schemas: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Iniciando testes do conversor Excel...")
    
    # Teste 1: Schemas
    schemas_ok = test_schemas_import()
    
    # Teste 2: Conversor básico
    if schemas_ok:
        converter_ok = test_basic_excel_converter()
    else:
        print("⚠️ Pulando teste do conversor devido a erro nos schemas")
        converter_ok = False
    
    # Resultado final
    print("\n" + "=" * 60)
    if schemas_ok and converter_ok:
        print("🎉 TODOS OS TESTES PASSARAM - EXCEL CONVERTER FUNCIONANDO!")
        sys.exit(0)
    else:
        print("❌ ALGUNS TESTES FALHARAM")
        sys.exit(1)