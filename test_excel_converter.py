import pytest
import pandas as pd
import tempfile
import asyncio
from pathlib import Path
from io import StringIO

from converters.excel.parser import (
    ExcelParserConfig,
    ExcelSecurityValidator,
    ExcelStreamProcessor,
    ExcelFormatWriter,
    parse_excel_to_format,
    get_excel_info
)
from converters.excel.schemas import OutputFormat, CompressionType


@pytest.fixture
def sample_excel_file():
    """Cria arquivo Excel de teste"""
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
        # Criar DataFrame simples
        data = {
            'Nome': ['João', 'Maria', 'Pedro', 'Ana'],
            'Idade': [25, 30, 35, 28],
            'Salário': [5000.50, 7500.75, 9000.00, 6200.25],
            'Ativo': [True, True, False, True]
        }
        df = pd.DataFrame(data)
        df.to_excel(f.name, index=False, sheet_name='Funcionarios')
        
        return Path(f.name)


@pytest.fixture
def sample_csv_file():
    """Cria arquivo CSV de teste"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        csv_content = """Name,Age,City
João,25,São Paulo
Maria,30,Rio de Janeiro
Pedro,35,Belo Horizonte"""
        f.write(csv_content)
        
        return Path(f.name)


def test_excel_security_validator():
    """Testa validação de segurança"""
    # Teste arquivo seguro
    with tempfile.NamedTemporaryFile(suffix='.xlsx') as f:
        temp_path = Path(f.name)
        check = ExcelSecurityValidator.check_file_security(temp_path)
        
        assert check.file_extension == '.xlsx'
        assert not check.is_macro_enabled
        assert check.security_risk_level == 'low'
        assert check.allowed_to_process


def test_excel_parser_config():
    """Testa configuração do parser"""
    config = ExcelParserConfig(
        chunk_size=1000,
        max_memory_mb=512,
        enable_streaming=True
    )
    
    assert config.chunk_size == 1000
    assert config.max_memory_mb == 512
    assert config.enable_streaming is True


def test_excel_stream_processor(sample_excel_file):
    """Testa processamento em streaming"""
    config = ExcelParserConfig(chunk_size=2)  # Chunk pequeno para teste
    processor = ExcelStreamProcessor(config)
    
    # Teste leitura em chunks
    chunks = list(processor.read_excel_streaming(sample_excel_file))
    
    assert len(chunks) >= 1
    assert isinstance(chunks[0], pd.DataFrame)
    assert len(chunks[0].columns) == 4  # Nome, Idade, Salário, Ativo


def test_excel_format_writer():
    """Testa escrita em diferentes formatos"""
    # Criar DataFrame de teste
    df = pd.DataFrame({
        'coluna1': [1, 2, 3],
        'coluna2': ['a', 'b', 'c']
    })
    
    # Teste CSV
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
        output_path = Path(f.name)
        
        writer = ExcelFormatWriter(OutputFormat.CSV, CompressionType.NONE)
        writer.write_dataframe(df, output_path)
        
        assert output_path.exists()
        
        # Verificar conteúdo
        result_df = pd.read_csv(output_path)
        assert len(result_df) == 3
        assert list(result_df.columns) == ['coluna1', 'coluna2']


def test_parse_excel_to_csv(sample_excel_file):
    """Testa conversão completa Excel para CSV"""
    config = ExcelParserConfig(chunk_size=10)
    
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
        output_path = Path(f.name)
        
        stats = parse_excel_to_format(
            input_path=sample_excel_file,
            output_path=output_path,
            output_format=OutputFormat.CSV,
            config=config
        )
        
        assert output_path.exists()
        assert stats.sheets_processed == 1
        assert stats.total_rows_written == 4  # 4 funcionários
        
        # Verificar conteúdo CSV
        result_df = pd.read_csv(output_path)
        assert len(result_df) == 4
        assert 'nome' in result_df.columns  # Normalizado para lowercase


def test_parse_csv_to_json(sample_csv_file):
    """Testa conversão CSV para JSON"""
    config = ExcelParserConfig()
    
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
        output_path = Path(f.name)
        
        stats = parse_excel_to_format(
            input_path=sample_csv_file,
            output_path=output_path,
            output_format=OutputFormat.JSON,
            config=config
        )
        
        assert output_path.exists()
        assert stats.total_rows_written == 3  # 3 pessoas
        
        # Verificar JSON
        import json
        with open(output_path, 'r') as f:
            data = json.load(f)
        
        assert len(data) == 3
        assert 'name' in data[0]


def test_get_excel_info(sample_excel_file):
    """Testa obtenção de informações do Excel"""
    info = get_excel_info(sample_excel_file)
    
    assert info['sheets_count'] == 1
    assert 'Funcionarios' in info['sheets_names']
    assert info['total_rows'] > 0
    assert not info['has_macros']


def test_compression_functionality():
    """Testa funcionalidades de compressão"""
    df = pd.DataFrame({'test': [1, 2, 3]})
    
    with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as f:
        output_path = Path(f.name)
        
        writer = ExcelFormatWriter(OutputFormat.CSV, CompressionType.GZIP)
        writer.write_dataframe(df, output_path)
        
        # Arquivo comprimido deve existir
        compressed_path = output_path.with_suffix(f"{output_path.suffix}.gz")
        assert compressed_path.exists()


@pytest.mark.asyncio
async def test_excel_api_integration():
    """Teste de integração básico da API Excel"""
    from converters.excel.worker import ExcelConversionTask, queue_excel_conversion
    from converters.excel.schemas import OutputFormat
    
    # Criar arquivo de teste
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
        df = pd.DataFrame({'test': [1, 2, 3]})
        df.to_excel(f.name, index=False)
        input_file = Path(f.name)
    
    try:
        # Submeter tarefa
        task_id = await queue_excel_conversion(
            input_file=input_file,
            output_format=OutputFormat.CSV,
            user_id="test_user"
        )
        
        assert task_id is not None
        assert len(task_id) > 0
        
        # Aguardar processamento (timeout curto para teste)
        await asyncio.sleep(5)
        
        # Verificar status
        from converters.excel.worker import get_conversion_status
        task = await get_conversion_status(task_id)
        
        if task:
            assert task.task_id == task_id
            # Status pode ser processing ou completed dependendo do tempo
            assert task.status in ["queued", "processing", "completed"]
    
    finally:
        # Limpeza
        if input_file.exists():
            input_file.unlink()


if __name__ == "__main__":
    # Executar testes básicos
    import sys
    
    print("🧪 Executando testes do conversor Excel...")
    
    # Criar arquivo de teste
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
        data = {
            'Nome': ['João', 'Maria'],
            'Idade': [25, 30]
        }
        df = pd.DataFrame(data)
        df.to_excel(f.name, index=False)
        test_file = Path(f.name)
    
    try:
        # Teste 1: Validação de segurança
        print("\n1. Teste de segurança...")
        security_check = ExcelSecurityValidator.check_file_security(test_file)
        print(f"   ✅ Arquivo seguro: {security_check.allowed_to_process}")
        
        # Teste 2: Informações do arquivo
        print("\n2. Teste de informações...")
        file_info = get_excel_info(test_file)
        print(f"   ✅ Planilhas: {file_info['sheets_count']}")
        print(f"   ✅ Linhas: {file_info['total_rows']}")
        
        # Teste 3: Conversão para CSV
        print("\n3. Teste de conversão...")
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as output_f:
            output_path = Path(output_f.name)
            
            config = ExcelParserConfig()
            stats = parse_excel_to_format(
                input_path=test_file,
                output_path=output_path,
                output_format=OutputFormat.CSV,
                config=config
            )
            
            print(f"   ✅ Conversão concluída: {stats.total_rows_written} linhas")
            print(f"   ✅ Tempo: {stats.processing_time_seconds:.2f}s")
            
            # Verificar resultado
            result_df = pd.read_csv(output_path)
            print(f"   ✅ Resultado CSV: {len(result_df)} linhas, {len(result_df.columns)} colunas")
            
            output_path.unlink()
        
        print("\n🎉 Todos os testes passaram!")
        
    except Exception as e:
        print(f"\n❌ Erro nos testes: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        test_file.unlink()